"""
BE-STG12-004: Persistent Idempotency using Supabase/PostgreSQL.
Survives server restarts and works across multiple instances.
TTL: 24 hours (configurable via IDEMPOTENCY_TTL_HOURS env var)
"""
import hashlib
import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from services.supabase_client import get_service_client

logger = logging.getLogger(__name__)

# TTL for idempotency keys (default 24 hours)
IDEMPOTENCY_TTL_HOURS = int(os.getenv("IDEMPOTENCY_TTL_HOURS", "24"))


def _hash_payload(payload: dict) -> str:
    """Create a hash of the request payload for comparison."""
    payload_str = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(payload_str.encode()).hexdigest()[:16]


class IdempotencyResult:
    """Result of idempotency check."""

    def __init__(
        self,
        hit: bool = False,
        task_id: Optional[str] = None,
        mismatch: bool = False,
    ):
        self.hit = hit
        self.task_id = task_id
        self.mismatch = mismatch


def check_idempotency(user_id: str, key: str, payload: dict) -> IdempotencyResult:
    """
    Check if an idempotency key exists and matches payload.
    Uses Supabase for persistent storage across restarts.

    Args:
        user_id: User ID (for scoping keys per user)
        key: Idempotency-Key header value
        payload: Request body as dict

    Returns:
        IdempotencyResult with:
        - hit=True, task_id=X if found and payload matches
        - hit=False, mismatch=True if key exists but payload differs
        - hit=False, mismatch=False if key not found or expired
    """
    try:
        client = get_service_client()

        # Calculate TTL cutoff
        cutoff = datetime.now(timezone.utc) - timedelta(hours=IDEMPOTENCY_TTL_HOURS)

        # Query for existing key (within TTL)
        result = (
            client.table("idempotency_keys")
            .select("payload_hash, task_id, created_at")
            .eq("user_id", user_id)
            .eq("idempotency_key", key)
            .gte("created_at", cutoff.isoformat())
            .limit(1)
            .execute()
        )

        # Debug logging
        logger.info(f"[IDEMP] CHECK user={user_id[:8]}... key={key[:8]}...")

        if not result.data:
            logger.info(f"[IDEMP] MISS user={user_id[:8]}... key={key[:8]}...")
            return IdempotencyResult(hit=False, mismatch=False)

        cached = result.data[0]
        payload_hash = _hash_payload(payload)

        if cached["payload_hash"] == payload_hash:
            logger.info(
                f"[IDEMP] HIT user={user_id[:8]}... key={key[:8]}... → task={cached['task_id']}"
            )
            return IdempotencyResult(hit=True, task_id=cached["task_id"])
        else:
            logger.warning(
                f"[IDEMP] CONFLICT user={user_id[:8]}... key={key[:8]}... payload mismatch"
            )
            return IdempotencyResult(hit=False, mismatch=True)

    except Exception as e:
        # On DB error, log FULL error and treat as cache miss (fail-open)
        import traceback
        logger.error(f"[IDEMP] DB error during check: {e}")
        logger.error(f"[IDEMP] Traceback: {traceback.format_exc()}")
        return IdempotencyResult(hit=False, mismatch=False)


def store_idempotency(user_id: str, key: str, payload: dict, task_id: str) -> bool:
    """
    Store idempotency key with task_id and payload hash.
    Uses upsert to handle race conditions.

    Args:
        user_id: User ID
        key: Idempotency-Key header value
        payload: Request body as dict
        task_id: Created task ID

    Returns:
        True if stored successfully, False on error
    """
    try:
        client = get_service_client()
        payload_hash = _hash_payload(payload)

        # Upsert: insert or update if exists
        upsert_data = {
            "user_id": user_id,
            "idempotency_key": key,
            "payload_hash": payload_hash,
            "task_id": task_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        result = client.table("idempotency_keys").upsert(
            upsert_data,
            on_conflict="user_id,idempotency_key",
        ).execute()

        logger.info(
            f"[IDEMP] STORED user={user_id[:8]}... key={key[:8]}... → task={task_id} (TTL={IDEMPOTENCY_TTL_HOURS}h)"
        )
        return True

    except Exception as e:
        import traceback
        logger.error(f"[IDEMP] DB error during store: {e}")
        logger.error(f"[IDEMP] Store traceback: {traceback.format_exc()}")
        return False


def cleanup_expired_keys() -> int:
    """
    Delete expired idempotency keys.
    Can be called via cron job or admin endpoint.

    Returns:
        Number of deleted keys
    """
    try:
        client = get_service_client()
        cutoff = datetime.now(timezone.utc) - timedelta(hours=IDEMPOTENCY_TTL_HOURS)

        result = (
            client.table("idempotency_keys")
            .delete()
            .lt("created_at", cutoff.isoformat())
            .execute()
        )

        deleted = len(result.data) if result.data else 0
        logger.info(f"[IDEMP] Cleanup: deleted {deleted} expired keys")
        return deleted

    except Exception as e:
        logger.error(f"[IDEMP] Cleanup error: {e}")
        return 0
