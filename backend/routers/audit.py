# -*- coding: utf-8 -*-
"""
BE-STG13-012: Audit logs admin endpoint.

Admin-only access via X-Admin-Secret header.
"""
import hmac
import logging
import os
from typing import Optional

from fastapi import APIRouter, Query, Request

from services.audit import audit_service
from services.error_response import error_response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/audit-logs", tags=["Audit"])


def verify_admin_secret(request: Request) -> bool:
    """Verify admin secret header."""
    admin_secret = os.getenv("ADMIN_SECRET", "").strip()
    if not admin_secret or len(admin_secret) < 32:
        return False

    provided_secret = request.headers.get("X-Admin-Secret", "")
    if not provided_secret:
        return False

    return hmac.compare_digest(admin_secret, provided_secret)


@router.get("")
async def get_audit_logs(
    request: Request,
    entity_type: Optional[str] = Query(default=None, description="Filter by entity type"),
    entity_id: Optional[str] = Query(default=None, description="Filter by entity ID"),
    actor_user_id: Optional[str] = Query(default=None, description="Filter by actor user ID"),
    action: Optional[str] = Query(default=None, description="Filter by action"),
    limit: int = Query(default=50, ge=1, le=100, description="Number of results"),
    cursor: Optional[str] = Query(default=None, description="Pagination cursor"),
):
    """
    Query audit logs (admin only).

    Requires X-Admin-Secret header with valid admin secret.

    Returns:
        {
            "data": [...],
            "nextCursor": "..."
        }
    """
    request_id = getattr(request.state, "request_id", "unknown")

    # Verify admin access
    if not verify_admin_secret(request):
        logger.warning(f"[{request_id}] Audit logs access denied - invalid admin secret")
        return error_response(
            status_code=403,
            code="FORBIDDEN",
            message="Admin access required",
            request_id=request_id,
        )

    # Query audit logs
    logs, next_cursor = audit_service.query(
        entity_type=entity_type,
        entity_id=entity_id,
        actor_user_id=actor_user_id,
        action=action,
        limit=limit,
        cursor=cursor,
    )

    logger.info(
        f"[{request_id}] AUDIT_QUERY entity_type={entity_type} entity_id={entity_id} "
        f"action={action} count={len(logs)}"
    )

    return {
        "data": logs,
        "nextCursor": next_cursor,
    }
