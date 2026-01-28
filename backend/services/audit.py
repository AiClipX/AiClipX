# -*- coding: utf-8 -*-
"""
BE-STG13-012: Audit logging service.

Tracks critical actions per user with requestId correlation.
Uses fire-and-forget async writes (best-effort, non-blocking).
"""
import asyncio
import base64
import logging
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from services.supabase_client import get_service_client

logger = logging.getLogger(__name__)


def encode_cursor(occurred_at: datetime, log_id: str) -> str:
    """Encode cursor as base64 string."""
    raw = f"{occurred_at.isoformat()}|{log_id}"
    return base64.urlsafe_b64encode(raw.encode()).decode()


def decode_cursor(cursor: str) -> Optional[Tuple[datetime, str]]:
    """Decode cursor from base64 string."""
    try:
        raw = base64.urlsafe_b64decode(cursor.encode()).decode()
        parts = raw.split("|")
        if len(parts) == 2:
            occurred_at = datetime.fromisoformat(parts[0])
            log_id = parts[1]
            return occurred_at, log_id
        return None
    except Exception:
        return None


class AuditService:
    """
    Service for audit logging with fire-and-forget writes.

    Usage:
        audit_service.emit(
            action="task.create",
            entity_type="video_task",
            entity_id=task.id,
            actor_user_id=user_id,
            request_id=request_id,
            ip=client_ip,
            user_agent=ua,
            meta={"engine": "runway"}
        )
    """

    def emit(
        self,
        action: str,
        entity_type: str,
        entity_id: Optional[str] = None,
        actor_user_id: Optional[str] = None,
        request_id: Optional[str] = None,
        ip: Optional[str] = None,
        user_agent: Optional[str] = None,
        meta: Optional[dict] = None,
    ) -> None:
        """
        Fire-and-forget audit log entry.

        Args:
            action: Action performed (e.g., "task.create", "auth.login")
            entity_type: Type of entity (e.g., "video_task", "session")
            entity_id: ID of the affected entity
            actor_user_id: User who performed the action (None for system)
            request_id: Request ID for correlation
            ip: Client IP address
            user_agent: Client user agent
            meta: Additional context (NO secrets/URLs!)
        """
        # Fire and forget - don't await
        asyncio.create_task(
            self._write_log(
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                actor_user_id=actor_user_id,
                request_id=request_id,
                ip=ip,
                user_agent=user_agent,
                meta=meta,
            )
        )

    async def _write_log(
        self,
        action: str,
        entity_type: str,
        entity_id: Optional[str],
        actor_user_id: Optional[str],
        request_id: Optional[str],
        ip: Optional[str],
        user_agent: Optional[str],
        meta: Optional[dict],
    ) -> None:
        """Actually write the audit log entry."""
        try:
            client = get_service_client()

            data = {
                "action": action,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "actor_user_id": actor_user_id,
                "request_id": request_id,
                "ip": ip,
                "user_agent": user_agent[:500] if user_agent else None,  # Truncate
                "meta": meta,
            }

            client.table("audit_logs").insert(data).execute()

            logger.debug(
                f"[{request_id or 'system'}] AUDIT {action} "
                f"entity={entity_type}/{entity_id} actor={actor_user_id[:8] if actor_user_id else 'system'}..."
            )

        except Exception as e:
            # Best-effort - log warning but don't fail
            logger.warning(
                f"[{request_id or 'system'}] Audit log write failed: {type(e).__name__}: {e}"
            )

    def query(
        self,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        actor_user_id: Optional[str] = None,
        action: Optional[str] = None,
        limit: int = 50,
        cursor: Optional[str] = None,
    ) -> Tuple[List[dict], Optional[str]]:
        """
        Query audit logs (admin only).

        Args:
            entity_type: Filter by entity type
            entity_id: Filter by entity ID
            actor_user_id: Filter by actor
            action: Filter by action
            limit: Number of results (1-100)
            cursor: Pagination cursor

        Returns:
            Tuple of (logs list, next cursor or None)
        """
        client = get_service_client()

        query = client.table("audit_logs").select(
            "id, occurred_at, actor_user_id, action, entity_type, entity_id, request_id, ip, user_agent, meta"
        )

        # Apply filters
        if entity_type:
            query = query.eq("entity_type", entity_type)
        if entity_id:
            query = query.eq("entity_id", entity_id)
        if actor_user_id:
            query = query.eq("actor_user_id", actor_user_id)
        if action:
            query = query.eq("action", action)

        # Apply cursor pagination
        if cursor:
            decoded = decode_cursor(cursor)
            if decoded:
                cursor_time, cursor_id = decoded
                query = query.or_(
                    f"occurred_at.lt.{cursor_time.isoformat()},"
                    f"and(occurred_at.eq.{cursor_time.isoformat()},id.lt.{cursor_id})"
                )

        # Order by occurred_at DESC, id DESC
        query = query.order("occurred_at", desc=True).order("id", desc=True)

        # Fetch limit + 1 to check for more
        response = query.limit(limit + 1).execute()

        logs = response.data[:limit]
        has_more = len(response.data) > limit

        # Calculate next cursor
        next_cursor = None
        if has_more and logs:
            last_log = logs[-1]
            next_cursor = encode_cursor(
                datetime.fromisoformat(last_log["occurred_at"].replace("Z", "+00:00")),
                last_log["id"]
            )

        return logs, next_cursor


# Singleton instance
audit_service = AuditService()
