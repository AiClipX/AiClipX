# -*- coding: utf-8 -*-
"""
BE-STG13-018: Admin endpoints for system health and monitoring.

Protected by X-Admin-Secret header.
"""
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from fastapi import APIRouter, Header, Request
from fastapi.responses import JSONResponse

from services.supabase_client import get_service_client
from services.resilience import runway_circuit_breaker
from services.quota import MAX_TASKS_PER_DAY_PER_USER

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])

# Config
ADMIN_SECRET = os.getenv("ADMIN_SECRET", "")
BUILD_VERSION = os.getenv("BUILD_VERSION", "dev")
BUILD_COMMIT = os.getenv("BUILD_COMMIT", "unknown")
BUILD_DEPLOYED_AT = os.getenv("BUILD_DEPLOYED_AT", datetime.now(timezone.utc).isoformat())


def _verify_admin_secret(secret: str, request_id: str) -> JSONResponse | None:
    """Verify admin secret header. Returns error response if invalid."""
    if not ADMIN_SECRET:
        logger.warning(f"[{request_id}] ADMIN_UNAUTHORIZED: ADMIN_SECRET not configured")
        return JSONResponse(
            status_code=401,
            content={
                "code": "ADMIN_UNAUTHORIZED",
                "message": "Admin endpoint not configured",
                "requestId": request_id,
            },
            headers={"X-Request-Id": request_id},
        )

    if secret != ADMIN_SECRET:
        logger.warning(f"[{request_id}] ADMIN_UNAUTHORIZED: Invalid secret")
        return JSONResponse(
            status_code=401,
            content={
                "code": "ADMIN_UNAUTHORIZED",
                "message": "Invalid admin credentials",
                "requestId": request_id,
            },
            headers={"X-Request-Id": request_id},
        )

    return None


def _get_task_stats_last_1h() -> Dict[str, int]:
    """Get task statistics for the last hour from database."""
    stats = {"created": 0, "completed": 0, "failed": 0, "cancelled": 0}

    try:
        service_client = get_service_client()
        one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)

        # Total created in last hour
        created_response = (
            service_client.table("video_tasks")
            .select("id", count="exact")
            .gte("created_at", one_hour_ago.isoformat())
            .execute()
        )
        stats["created"] = created_response.count or 0

        # Completed in last hour (by updated_at since completed_at may not exist)
        completed_response = (
            service_client.table("video_tasks")
            .select("id", count="exact")
            .eq("status", "completed")
            .gte("updated_at", one_hour_ago.isoformat())
            .execute()
        )
        stats["completed"] = completed_response.count or 0

        # Failed in last hour (by updated_at)
        failed_response = (
            service_client.table("video_tasks")
            .select("id", count="exact")
            .eq("status", "failed")
            .gte("updated_at", one_hour_ago.isoformat())
            .execute()
        )
        stats["failed"] = failed_response.count or 0

        # Cancelled in last hour (by updated_at)
        cancelled_response = (
            service_client.table("video_tasks")
            .select("id", count="exact")
            .eq("status", "cancelled")
            .gte("updated_at", one_hour_ago.isoformat())
            .execute()
        )
        stats["cancelled"] = cancelled_response.count or 0

    except Exception as e:
        logger.error(f"Failed to get task stats: {e}")

    return stats


def _get_active_task_counts() -> Dict[str, int]:
    """Get counts of currently active tasks (queued and processing)."""
    counts = {"queued": 0, "processing": 0}

    try:
        service_client = get_service_client()

        # Count queued
        queued_response = (
            service_client.table("video_tasks")
            .select("id", count="exact")
            .eq("status", "queued")
            .execute()
        )
        counts["queued"] = queued_response.count or 0

        # Count processing
        processing_response = (
            service_client.table("video_tasks")
            .select("id", count="exact")
            .eq("status", "processing")
            .execute()
        )
        counts["processing"] = processing_response.count or 0

    except Exception as e:
        logger.error(f"Failed to get active task counts: {e}")

    return counts


@router.get("/health")
async def admin_health(
    request: Request,
    x_admin_secret: str = Header(default="", alias="X-Admin-Secret"),
) -> Dict[str, Any]:
    """
    BE-STG13-018: Admin health endpoint for system monitoring.

    Returns comprehensive system health including:
    - Build info (version, commit, deploy time)
    - Engine availability and circuit breaker state
    - Task statistics (last 1h and current active)

    **Auth:** Requires X-Admin-Secret header
    """
    request_id = getattr(request.state, "request_id", "unknown")
    logger.info(f"[{request_id}] GET /api/admin/health")

    # Verify admin secret
    error_response = _verify_admin_secret(x_admin_secret, request_id)
    if error_response:
        return error_response

    # Check Runway availability
    runway_key = os.getenv("RUNWAY_API_KEY", "")
    runway_available = bool(runway_key and runway_key.strip()) and not runway_circuit_breaker.is_open()

    # Get circuit breaker status
    circuit_status = runway_circuit_breaker.get_status()

    # Get task stats
    last_1h_stats = _get_task_stats_last_1h()
    active_counts = _get_active_task_counts()

    health_response = {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "requestId": request_id,
        "build": {
            "version": BUILD_VERSION,
            "commit": BUILD_COMMIT,
            "deployedAt": BUILD_DEPLOYED_AT,
        },
        "engines": {
            "runway": {
                "available": runway_available,
                "circuitState": circuit_status["state"],
                "failureCount": circuit_status["failure_count"],
            },
            "mock": {
                "available": os.getenv("ENABLE_MOCK_ENGINE", "true").lower() == "true",
            },
        },
        "config": {
            "maxTasksPerDayPerUser": MAX_TASKS_PER_DAY_PER_USER,
        },
        "stats": {
            "last1h": last_1h_stats,
            "activeNow": active_counts,
        },
    }

    logger.info(f"[{request_id}] Admin health check: status=healthy")

    return health_response
