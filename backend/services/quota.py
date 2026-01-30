# -*- coding: utf-8 -*-
"""
BE-STG13-018: Per-user daily quota service.

Prevents abuse by limiting the number of tasks a user can create per day.
Resets at 00:00 UTC daily.
"""
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timezone

from services.supabase_client import get_service_client

logger = logging.getLogger(__name__)

# Config: Daily task quota per user
MAX_TASKS_PER_DAY_PER_USER = int(os.getenv("MAX_TASKS_PER_DAY_PER_USER", "50"))


@dataclass
class QuotaCheckResult:
    """Result of a quota check."""
    exceeded: bool
    used: int
    limit: int
    resets_at: datetime


def count_tasks_created_today(user_id: str) -> int:
    """Count tasks created by user since midnight UTC today."""
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


def check_daily_quota(user_id: str) -> QuotaCheckResult:
    """
    Check if user has exceeded their daily quota.

    Returns QuotaCheckResult with:
    - exceeded: True if quota exceeded
    - used: Number of tasks created today
    - limit: Maximum allowed tasks per day
    - resets_at: When the quota resets (next midnight UTC)
    """
    used = count_tasks_created_today(user_id)
    exceeded = used >= MAX_TASKS_PER_DAY_PER_USER

    # Calculate next reset time (next midnight UTC)
    now = datetime.now(timezone.utc)
    tomorrow = now.replace(hour=0, minute=0, second=0, microsecond=0)
    if tomorrow <= now:
        from datetime import timedelta
        tomorrow = tomorrow + timedelta(days=1)

    return QuotaCheckResult(
        exceeded=exceeded,
        used=used,
        limit=MAX_TASKS_PER_DAY_PER_USER,
        resets_at=tomorrow,
    )


def get_quota_reset_time() -> datetime:
    """Get the next quota reset time (midnight UTC)."""
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    tomorrow = now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    return tomorrow
