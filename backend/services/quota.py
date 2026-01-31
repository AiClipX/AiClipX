# -*- coding: utf-8 -*-
"""
BE-STG13-018 + BE-STG13-021: Per-user quota service.

Prevents abuse by limiting:
- Tasks per day (resets at 00:00 UTC)
- Concurrent active tasks
- Asset uploads per user
- Total asset storage per user

DEGRADATION RULE (BE-STG13-021):
If quota config/store is missing or misconfigured:
- Cost-risk endpoints (task create, asset upload): FAIL CLOSED (reject)
- Read-only endpoints: ALLOW (no cost impact)
This prevents runaway costs if quota system is misconfigured.
"""
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi.responses import JSONResponse

from services.supabase_client import get_service_client

logger = logging.getLogger(__name__)

# =============================================================================
# Quota Configuration
# =============================================================================

# Task quotas
MAX_TASKS_PER_DAY_PER_USER = int(os.getenv("MAX_TASKS_PER_DAY_PER_USER", "50"))

# Asset quotas
MAX_ASSET_UPLOAD_COUNT = int(os.getenv("MAX_ASSET_UPLOAD_COUNT", "100"))
MAX_ASSET_TOTAL_BYTES = int(os.getenv("MAX_ASSET_TOTAL_BYTES", "524288000"))  # 500MB

# Feature flags
QUOTA_ENFORCED = os.getenv("QUOTA_ENFORCED", "true").lower() == "true"
ASSET_UPLOAD_ENABLED = os.getenv("ASSET_UPLOAD_ENABLED", "true").lower() == "true"


# =============================================================================
# Quota Check Results
# =============================================================================

@dataclass
class QuotaCheckResult:
    """Result of a quota check."""
    exceeded: bool
    current: int
    limit: int
    resets_at: Optional[datetime] = None  # None for non-resetting quotas
    quota_name: str = ""


# =============================================================================
# Quota Names (for unified error responses)
# =============================================================================

QUOTA_NAME_DAILY_TASKS = "max_tasks_per_day"
QUOTA_NAME_ACTIVE_TASKS = "max_active_tasks"
QUOTA_NAME_ASSET_UPLOADS = "max_asset_uploads"
QUOTA_NAME_ASSET_BYTES = "max_asset_bytes"

# Legacy code mapping for backward compatibility
LEGACY_CODES = {
    QUOTA_NAME_DAILY_TASKS: "DAILY_QUOTA_EXCEEDED",
    QUOTA_NAME_ACTIVE_TASKS: "CONCURRENCY_LIMIT_EXCEEDED",
    QUOTA_NAME_ASSET_UPLOADS: "ASSET_UPLOAD_LIMIT_EXCEEDED",
    QUOTA_NAME_ASSET_BYTES: "ASSET_STORAGE_LIMIT_EXCEEDED",
}


# =============================================================================
# Unified Quota Error Response
# =============================================================================

def quota_exceeded_response(
    quota_name: str,
    current: int,
    limit: int,
    request_id: str,
    reset_at: Optional[datetime] = None,
) -> JSONResponse:
    """
    BE-STG13-021: Unified 429 response for all quota types.

    Returns consistent error format with:
    - code: "QUOTA_EXCEEDED" (unified)
    - legacyCode: specific code for backward compatibility
    - details: quotaName, current, limit, resetAt
    """
    legacy_code = LEGACY_CODES.get(quota_name, "QUOTA_EXCEEDED")

    # Build message based on quota type
    messages = {
        QUOTA_NAME_DAILY_TASKS: "Daily task limit reached. Resets at midnight UTC.",
        QUOTA_NAME_ACTIVE_TASKS: f"Maximum {limit} concurrent tasks allowed. Wait for existing tasks to complete.",
        QUOTA_NAME_ASSET_UPLOADS: f"Maximum {limit} asset uploads reached.",
        QUOTA_NAME_ASSET_BYTES: f"Storage limit of {limit // (1024*1024)}MB reached.",
    }
    message = messages.get(quota_name, "Quota exceeded.")

    details = {
        "quotaName": quota_name,
        "current": current,
        "limit": limit,
    }
    if reset_at:
        details["resetAt"] = reset_at.isoformat()

    logger.warning(
        f"[{request_id}] QUOTA_EXCEEDED: {quota_name} "
        f"current={current} limit={limit}"
    )

    return JSONResponse(
        status_code=429,
        content={
            "code": "QUOTA_EXCEEDED",
            "message": message,
            "requestId": request_id,
            "details": details,
            "legacyCode": legacy_code,
        },
        headers={"X-Request-Id": request_id},
    )


# =============================================================================
# Task Quota Functions
# =============================================================================

def count_tasks_created_today(user_id: str) -> int:
    """Count tasks created by user since midnight UTC today."""
    try:
        service_client = get_service_client()

        # Get start of today (midnight UTC)
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        response = (
            service_client.table("video_tasks")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .gte("created_at", today_start.isoformat())
            .execute()
        )

        return response.count or 0
    except Exception as e:
        logger.error(f"Failed to count daily tasks: {e}")
        # FAIL CLOSED: If we can't check, assume limit reached
        return MAX_TASKS_PER_DAY_PER_USER


def check_daily_quota(user_id: str) -> QuotaCheckResult:
    """
    Check if user has exceeded their daily quota.

    Returns QuotaCheckResult with:
    - exceeded: True if quota exceeded
    - current: Number of tasks created today
    - limit: Maximum allowed tasks per day
    - resets_at: When the quota resets (next midnight UTC)
    """
    current = count_tasks_created_today(user_id)
    exceeded = current >= MAX_TASKS_PER_DAY_PER_USER

    # Calculate next reset time (next midnight UTC)
    now = datetime.now(timezone.utc)
    tomorrow = now.replace(hour=0, minute=0, second=0, microsecond=0)
    if tomorrow <= now:
        tomorrow = tomorrow + timedelta(days=1)

    return QuotaCheckResult(
        exceeded=exceeded,
        current=current,
        limit=MAX_TASKS_PER_DAY_PER_USER,
        resets_at=tomorrow,
        quota_name=QUOTA_NAME_DAILY_TASKS,
    )


def get_quota_reset_time() -> datetime:
    """Get the next quota reset time (midnight UTC)."""
    now = datetime.now(timezone.utc)
    tomorrow = now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    return tomorrow


# =============================================================================
# Asset Quota Functions
# =============================================================================

def get_user_asset_stats(user_id: str) -> tuple[int, int]:
    """
    Get user's asset statistics.

    Returns:
        (upload_count, total_bytes)
    """
    try:
        service_client = get_service_client()

        # Count committed assets
        count_response = (
            service_client.table("user_assets")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .eq("status", "committed")
            .execute()
        )
        upload_count = count_response.count or 0

        # Sum total bytes
        bytes_response = (
            service_client.table("user_assets")
            .select("size_bytes")
            .eq("user_id", user_id)
            .eq("status", "committed")
            .execute()
        )
        total_bytes = sum(row.get("size_bytes", 0) for row in (bytes_response.data or []))

        return upload_count, total_bytes

    except Exception as e:
        logger.error(f"Failed to get asset stats: {e}")
        # FAIL CLOSED: If we can't check, assume limit reached
        return MAX_ASSET_UPLOAD_COUNT, MAX_ASSET_TOTAL_BYTES


def check_asset_upload_quota(user_id: str, new_file_size: int = 0) -> QuotaCheckResult:
    """
    Check if user can upload more assets.

    Args:
        user_id: User ID
        new_file_size: Size of the new file being uploaded (bytes)

    Returns:
        QuotaCheckResult for the most restrictive quota hit
    """
    upload_count, total_bytes = get_user_asset_stats(user_id)

    # Check upload count limit
    if upload_count >= MAX_ASSET_UPLOAD_COUNT:
        return QuotaCheckResult(
            exceeded=True,
            current=upload_count,
            limit=MAX_ASSET_UPLOAD_COUNT,
            resets_at=None,  # No auto-reset for asset count
            quota_name=QUOTA_NAME_ASSET_UPLOADS,
        )

    # Check total bytes limit
    projected_bytes = total_bytes + new_file_size
    if projected_bytes > MAX_ASSET_TOTAL_BYTES:
        return QuotaCheckResult(
            exceeded=True,
            current=total_bytes,
            limit=MAX_ASSET_TOTAL_BYTES,
            resets_at=None,  # No auto-reset for storage
            quota_name=QUOTA_NAME_ASSET_BYTES,
        )

    # All quotas OK
    return QuotaCheckResult(
        exceeded=False,
        current=upload_count,
        limit=MAX_ASSET_UPLOAD_COUNT,
        resets_at=None,
        quota_name=QUOTA_NAME_ASSET_UPLOADS,
    )
