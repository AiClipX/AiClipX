# -*- coding: utf-8 -*-
"""
BE-STG13-018: Lightweight log-based metrics service.

Emits structured log lines with [METRICS] prefix for easy parsing.
Queryable via Render logs (grep '[METRICS]').
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def emit_metric(event: str, **kwargs) -> None:
    """
    Emit a metric event to logs.

    Format: [METRICS] {event} key1=value1 key2=value2 ...

    Args:
        event: Event name (e.g., "task.created", "quota.exceeded")
        **kwargs: Key-value pairs to include in the metric

    Example:
        emit_metric("task.created", user="xxx", engine="runway", request_id="req_xxx")
        -> [METRICS] task.created user=xxx engine=runway request_id=req_xxx
    """
    # Build key=value pairs, filtering out None values
    parts = []
    for key, value in kwargs.items():
        if value is not None:
            # Sanitize value: truncate long strings, mask user IDs
            str_value = str(value)
            if key == "user" and len(str_value) > 8:
                str_value = str_value[:8] + "..."
            elif len(str_value) > 100:
                str_value = str_value[:100] + "..."
            parts.append(f"{key}={str_value}")

    metric_line = f"[METRICS] {event} " + " ".join(parts)
    logger.info(metric_line)


# Convenience functions for common metrics

def emit_task_created(user_id: str, engine: str, request_id: str, task_id: Optional[str] = None) -> None:
    """Emit metric when a task is created."""
    emit_metric("task.created", user=user_id, engine=engine, request_id=request_id, task_id=task_id)


def emit_task_queued(task_id: str, user_id: str) -> None:
    """Emit metric when a task is queued."""
    emit_metric("task.queued", task_id=task_id, user=user_id)


def emit_task_completed(task_id: str, user_id: str, latency_ms: int) -> None:
    """Emit metric when a task completes successfully."""
    emit_metric("task.completed", task_id=task_id, user=user_id, latency_ms=latency_ms)


def emit_task_failed(task_id: str, user_id: str, error_code: str) -> None:
    """Emit metric when a task fails."""
    emit_metric("task.failed", task_id=task_id, user=user_id, error_code=error_code)


def emit_task_cancelled(task_id: str, user_id: str) -> None:
    """Emit metric when a task is cancelled."""
    emit_metric("task.cancelled", task_id=task_id, user=user_id)


def emit_quota_exceeded(user_id: str, used: int, limit: int) -> None:
    """Emit metric when a user exceeds their daily quota."""
    emit_metric("quota.exceeded", user=user_id, type="daily", used=used, limit=limit)
