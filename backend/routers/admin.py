# -*- coding: utf-8 -*-
"""
BE-STG13-018: Admin endpoints for system health and monitoring.

Protected by X-Admin-Secret header.
"""
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Union

from fastapi import APIRouter, Header, Query, Request
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


def _verify_admin_secret(secret: str, request_id: str) -> Optional[JSONResponse]:
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


# =============================================================================
# BE-STG13-020: Metrics Snapshot Helpers
# =============================================================================


def _get_task_counts_in_window(minutes: int) -> Dict[str, int]:
    """Get task counts by status within time window."""
    counts = {
        "created": 0,
        "completed": 0,
        "failed": 0,
        "cancelled": 0,
        "processing": 0,
        "queued": 0,
    }

    try:
        service_client = get_service_client()
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=minutes)

        # Created in window
        created_resp = (
            service_client.table("video_tasks")
            .select("id", count="exact")
            .gte("created_at", cutoff.isoformat())
            .execute()
        )
        counts["created"] = created_resp.count or 0

        # Completed in window
        completed_resp = (
            service_client.table("video_tasks")
            .select("id", count="exact")
            .eq("status", "completed")
            .gte("updated_at", cutoff.isoformat())
            .execute()
        )
        counts["completed"] = completed_resp.count or 0

        # Failed in window
        failed_resp = (
            service_client.table("video_tasks")
            .select("id", count="exact")
            .eq("status", "failed")
            .gte("updated_at", cutoff.isoformat())
            .execute()
        )
        counts["failed"] = failed_resp.count or 0

        # Cancelled in window
        cancelled_resp = (
            service_client.table("video_tasks")
            .select("id", count="exact")
            .eq("status", "cancelled")
            .gte("updated_at", cutoff.isoformat())
            .execute()
        )
        counts["cancelled"] = cancelled_resp.count or 0

        # Currently queued (not time-bound)
        queued_resp = (
            service_client.table("video_tasks")
            .select("id", count="exact")
            .eq("status", "queued")
            .execute()
        )
        counts["queued"] = queued_resp.count or 0

        # Currently processing (not time-bound)
        processing_resp = (
            service_client.table("video_tasks")
            .select("id", count="exact")
            .eq("status", "processing")
            .execute()
        )
        counts["processing"] = processing_resp.count or 0

    except Exception as e:
        logger.error(f"Failed to get task counts: {e}")

    return counts


def _calculate_percentile(values: List[int], percentile: float) -> int:
    """Calculate percentile from sorted list of values."""
    if not values:
        return 0
    sorted_values = sorted(values)
    index = int(len(sorted_values) * percentile / 100)
    index = min(index, len(sorted_values) - 1)
    return sorted_values[index]


def _get_latency_stats(minutes: int) -> Dict[str, Any]:
    """
    Calculate latency percentiles from completed tasks.

    Returns:
        timeToProcessingMs: time from created_at to processing_at
        timeToCompleteMs: time from processing_at to completed_at
    """
    result = {
        "timeToProcessingMs": {"p50": 0, "p95": 0, "avg": 0, "samples": 0},
        "timeToCompleteMs": {"p50": 0, "p95": 0, "avg": 0, "samples": 0},
    }

    try:
        service_client = get_service_client()
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=minutes)

        # Get completed tasks with timestamps
        resp = (
            service_client.table("video_tasks")
            .select("created_at, processing_at, completed_at")
            .eq("status", "completed")
            .gte("completed_at", cutoff.isoformat())
            .not_.is_("processing_at", "null")
            .not_.is_("completed_at", "null")
            .limit(1000)  # Limit for performance
            .execute()
        )

        if not resp.data:
            return result

        time_to_processing = []
        time_to_complete = []

        for row in resp.data:
            try:
                created = datetime.fromisoformat(row["created_at"].replace("Z", "+00:00"))
                processing = datetime.fromisoformat(row["processing_at"].replace("Z", "+00:00"))
                completed = datetime.fromisoformat(row["completed_at"].replace("Z", "+00:00"))

                # Time from created to processing (queue time)
                ttp = int((processing - created).total_seconds() * 1000)
                if ttp >= 0:
                    time_to_processing.append(ttp)

                # Time from processing to completed (processing time)
                ttc = int((completed - processing).total_seconds() * 1000)
                if ttc >= 0:
                    time_to_complete.append(ttc)

            except (ValueError, TypeError, KeyError):
                continue

        # Calculate stats for time_to_processing
        if time_to_processing:
            result["timeToProcessingMs"] = {
                "p50": _calculate_percentile(time_to_processing, 50),
                "p95": _calculate_percentile(time_to_processing, 95),
                "avg": int(sum(time_to_processing) / len(time_to_processing)),
                "samples": len(time_to_processing),
            }

        # Calculate stats for time_to_complete
        if time_to_complete:
            result["timeToCompleteMs"] = {
                "p50": _calculate_percentile(time_to_complete, 50),
                "p95": _calculate_percentile(time_to_complete, 95),
                "avg": int(sum(time_to_complete) / len(time_to_complete)),
                "samples": len(time_to_complete),
            }

    except Exception as e:
        logger.error(f"Failed to get latency stats: {e}")

    return result


def _get_top_errors(minutes: int, limit: int = 5) -> List[Dict[str, Any]]:
    """Get top error messages by count within time window."""
    errors = []

    try:
        service_client = get_service_client()
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=minutes)

        # Get failed tasks with error messages
        resp = (
            service_client.table("video_tasks")
            .select("error_message")
            .eq("status", "failed")
            .gte("updated_at", cutoff.isoformat())
            .not_.is_("error_message", "null")
            .limit(500)
            .execute()
        )

        if not resp.data:
            return errors

        # Count error messages
        error_counts: Dict[str, int] = {}
        for row in resp.data:
            msg = row.get("error_message", "Unknown error")
            # Truncate for grouping
            msg_key = msg[:100] if msg else "Unknown error"
            error_counts[msg_key] = error_counts.get(msg_key, 0) + 1

        # Sort by count and take top N
        sorted_errors = sorted(error_counts.items(), key=lambda x: x[1], reverse=True)
        errors = [{"message": msg, "count": count} for msg, count in sorted_errors[:limit]]

    except Exception as e:
        logger.error(f"Failed to get top errors: {e}")

    return errors


@router.get("/metrics-snapshot")
async def metrics_snapshot(
    request: Request,
    x_admin_secret: str = Header(default="", alias="X-Admin-Secret"),
    minutes: int = Query(default=60, ge=1, le=1440, description="Time window in minutes (1-1440)"),
):
    """
    BE-STG13-020: Metrics snapshot endpoint for observability.

    Returns aggregated metrics within the specified time window:
    - Task counts by status
    - Latency percentiles (p50/p95/avg)
    - Top error messages

    **Auth:** Requires X-Admin-Secret header
    **Query params:** minutes (default: 60, max: 1440 = 24h)
    """
    request_id = getattr(request.state, "request_id", "unknown")
    logger.info(f"[{request_id}] GET /api/admin/metrics-snapshot?minutes={minutes}")

    # Verify admin secret
    error_resp = _verify_admin_secret(x_admin_secret, request_id)
    if error_resp:
        return error_resp

    try:
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(minutes=minutes)

        # Gather metrics
        task_counts = _get_task_counts_in_window(minutes)
        latency_stats = _get_latency_stats(minutes)
        top_errors = _get_top_errors(minutes)

        response = {
            "window": {
                "minutes": minutes,
                "from": window_start.isoformat(),
                "to": now.isoformat(),
            },
            "requestId": request_id,
            "tasks": task_counts,
            "latency": latency_stats,
            "topErrors": top_errors,
        }

        logger.info(
            f"[{request_id}] Metrics snapshot: created={task_counts['created']} "
            f"completed={task_counts['completed']} failed={task_counts['failed']}"
        )

        return response

    except Exception as e:
        logger.error(f"[{request_id}] Metrics snapshot error: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "code": "METRICS_ERROR",
                "message": f"Failed to get metrics: {str(e)}",
                "requestId": request_id,
            },
            headers={"X-Request-Id": request_id},
        )


@router.get("/health")
async def admin_health(
    request: Request,
    x_admin_secret: str = Header(default="", alias="X-Admin-Secret"),
):
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
    error_resp = _verify_admin_secret(x_admin_secret, request_id)
    if error_resp:
        return error_resp

    try:
        # Check Runway availability
        runway_key = os.getenv("RUNWAY_API_KEY", "")
        runway_available = bool(runway_key and runway_key.strip())

        # Get circuit breaker status
        circuit_state = "UNKNOWN"
        failure_count = 0
        try:
            circuit_status = runway_circuit_breaker.get_status()
            circuit_state = circuit_status.get("state", "UNKNOWN")
            failure_count = circuit_status.get("failure_count", 0)
            if runway_available and runway_circuit_breaker.is_open():
                runway_available = False
        except Exception as cb_err:
            logger.warning(f"[{request_id}] Circuit breaker error: {cb_err}")

        # Get task stats (graceful failure)
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
                    "circuitState": circuit_state,
                    "failureCount": failure_count,
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

    except Exception as e:
        logger.error(f"[{request_id}] Admin health error: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "code": "HEALTH_CHECK_ERROR",
                "message": f"Health check failed: {str(e)}",
                "requestId": request_id,
            },
            headers={"X-Request-Id": request_id},
        )
