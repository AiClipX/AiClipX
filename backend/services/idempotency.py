# -*- coding: utf-8 -*-
"""
BE-STG12-004 + BE-STG13-016: Persistent Idempotency using Supabase/PostgreSQL.

Survives server restarts and works across multiple instances.
TTL: 24 hours (configurable via IDEMPOTENCY_TTL_HOURS env var)

Refactored:
- Converted to async to avoid blocking event loop
- Added structured logging with context
- Extracted utility functions for DRY
"""

import asyncio
import hashlib
import json
import logging
import os
import traceback
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

from services.supabase_client import get_service_client
from services.utils import mask_id, mask_key

logger = logging.getLogger(__name__)

# Configuration
IDEMPOTENCY_TTL_HOURS = int(os.getenv("IDEMPOTENCY_TTL_HOURS", "24"))
IDEMPOTENCY_LOCK_RETRY_DELAY = float(os.getenv("IDEMPOTENCY_LOCK_RETRY_DELAY", "0.5"))


def _hash_payload(payload: dict) -> str:
    """
    Create a deterministic hash of the request payload for comparison.

    Args:
        payload: Request body dictionary

    Returns:
        16-character hex hash string
    """
    payload_str = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(payload_str.encode()).hexdigest()[:16]


def _get_ttl_cutoff() -> datetime:
    """Get the TTL cutoff timestamp for idempotency keys."""
    return datetime.now(timezone.utc) - timedelta(hours=IDEMPOTENCY_TTL_HOURS)


@dataclass
class IdempotencyResult:
    """Result of idempotency check."""
    hit: bool = False
    task_id: Optional[str] = None
    mismatch: bool = False


@dataclass
class AcquireResult:
    """Result of try_acquire_idempotency_lock."""
    acquired: bool = False
    existing_task_id: Optional[str] = None
    conflict: bool = False


async def check_idempotency(user_id: str, key: str, payload: dict) -> IdempotencyResult:
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
    user_masked = mask_id(user_id)
    key_masked = mask_key(key)

    try:
        client = get_service_client()
        cutoff = _get_ttl_cutoff()

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

        logger.info(f"[IDEMP] CHECK user={user_masked} key={key_masked}")

        if not result.data:
            logger.info(f"[IDEMP] MISS user={user_masked} key={key_masked}")
            return IdempotencyResult(hit=False, mismatch=False)

        cached = result.data[0]
        payload_hash = _hash_payload(payload)

        if cached["payload_hash"] == payload_hash:
            task_id = cached["task_id"]
            logger.info(f"[IDEMP] HIT user={user_masked} key={key_masked} → task={task_id}")
            return IdempotencyResult(hit=True, task_id=task_id)
        else:
            logger.warning(f"[IDEMP] CONFLICT user={user_masked} key={key_masked} payload mismatch")
            return IdempotencyResult(hit=False, mismatch=True)

    except Exception as e:
        # On DB error, log with context and treat as cache miss (fail-open)
        logger.error(
            f"[IDEMP] DB error during check: {e}",
            extra={
                "user_id": user_masked,
                "idempotency_key": key_masked,
                "error_type": type(e).__name__,
            }
        )
        logger.debug(f"[IDEMP] Traceback: {traceback.format_exc()}")
        return IdempotencyResult(hit=False, mismatch=False)


async def try_acquire_idempotency_lock(user_id: str, key: str, payload: dict) -> AcquireResult:
    """
    BE-STG13-016: Atomic idempotency lock acquisition.

    Attempts to INSERT the key first (atomic). If already exists, returns existing task.
    This prevents race conditions where two concurrent requests both pass check_idempotency
    before either has stored the key.

    Args:
        user_id: User ID
        key: Idempotency-Key header value
        payload: Request body as dict

    Returns:
        AcquireResult with:
        - acquired=True if lock acquired (caller should create task then call finalize_idempotency)
        - acquired=False, existing_task_id=X if key exists with matching payload
        - acquired=False, conflict=True if key exists with different payload
    """
    user_masked = mask_id(user_id)
    key_masked = mask_key(key)

    logger.info(f"[IDEMP] ACQUIRE user={user_masked} key={key_masked}")

    try:
        client = get_service_client()
        payload_hash = _hash_payload(payload)
        cutoff = _get_ttl_cutoff()

        # Prepare insert data
        insert_data = {
            "user_id": user_id,
            "idempotency_key": key,
            "payload_hash": payload_hash,
            "task_id": None,  # Will be updated after task creation
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        # Try to INSERT first (atomic lock acquisition)
        try:
            client.table("idempotency_keys").insert(insert_data).execute()
            logger.info(f"[IDEMP] ACQUIRED lock user={user_masked} key={key_masked}")
            return AcquireResult(acquired=True)
        except Exception as insert_err:
            error_str = str(insert_err).lower()
            # Check for duplicate key error
            if "duplicate" in error_str or "unique" in error_str or "23505" in error_str:
                logger.info(f"[IDEMP] Key exists, checking existing entry...")
            else:
                raise insert_err

        # Key exists - fetch and compare
        result = (
            client.table("idempotency_keys")
            .select("payload_hash, task_id, created_at")
            .eq("user_id", user_id)
            .eq("idempotency_key", key)
            .gte("created_at", cutoff.isoformat())
            .limit(1)
            .execute()
        )

        if not result.data:
            # Expired or deleted, try insert again
            logger.info(f"[IDEMP] Existing entry expired, retrying insert...")
            client.table("idempotency_keys").insert(insert_data).execute()
            return AcquireResult(acquired=True)

        cached = result.data[0]

        # Check payload match
        if cached["payload_hash"] != payload_hash:
            logger.warning(f"[IDEMP] CONFLICT user={user_masked} key={key_masked} payload mismatch")
            return AcquireResult(acquired=False, conflict=True)

        # Payload matches
        if cached["task_id"]:
            task_id = cached["task_id"]
            logger.info(f"[IDEMP] HIT user={user_masked} key={key_masked} → task={task_id}")
            return AcquireResult(acquired=False, existing_task_id=task_id)

        # Another request is creating (task_id=None), wait and retry
        logger.info(f"[IDEMP] Lock held by another request, waiting {IDEMPOTENCY_LOCK_RETRY_DELAY}s...")

        # Non-blocking sleep (fixed from time.sleep)
        await asyncio.sleep(IDEMPOTENCY_LOCK_RETRY_DELAY)

        # Re-fetch after wait
        result = (
            client.table("idempotency_keys")
            .select("task_id")
            .eq("user_id", user_id)
            .eq("idempotency_key", key)
            .limit(1)
            .execute()
        )

        if result.data and result.data[0]["task_id"]:
            task_id = result.data[0]["task_id"]
            logger.info(f"[IDEMP] Lock resolved → task={task_id}")
            return AcquireResult(acquired=False, existing_task_id=task_id)

        # Still no task_id, let caller handle
        logger.warning(f"[IDEMP] Lock timeout, existing request may have failed")
        return AcquireResult(acquired=False, existing_task_id=None)

    except Exception as e:
        logger.error(
            f"[IDEMP] DB error during acquire: {e}",
            extra={
                "user_id": user_masked,
                "idempotency_key": key_masked,
                "error_type": type(e).__name__,
            }
        )
        logger.debug(f"[IDEMP] Traceback: {traceback.format_exc()}")
        # Fail-open: allow request to proceed
        return AcquireResult(acquired=True)


async def finalize_idempotency(user_id: str, key: str, task_id: str) -> bool:
    """
    BE-STG13-016: Update idempotency record with created task_id.

    Called after task is successfully created.

    Args:
        user_id: User ID
        key: Idempotency-Key header value
        task_id: Created task ID

    Returns:
        True if updated successfully
    """
    user_masked = mask_id(user_id)
    key_masked = mask_key(key)

    logger.info(f"[IDEMP] FINALIZE user={user_masked} key={key_masked} task={task_id}")

    try:
        client = get_service_client()
        client.table("idempotency_keys").update({"task_id": task_id}).eq(
            "user_id", user_id
        ).eq("idempotency_key", key).execute()

        logger.info(f"[IDEMP] FINALIZED user={user_masked} key={key_masked} → task={task_id}")
        return True
    except Exception as e:
        logger.error(f"[IDEMP] DB error during finalize: {e}")
        return False


async def store_idempotency(user_id: str, key: str, payload: dict, task_id: str) -> bool:
    """
    Store idempotency key with task_id and payload hash.

    Uses insert with duplicate handling.

    Args:
        user_id: User ID
        key: Idempotency-Key header value
        payload: Request body as dict
        task_id: Created task ID

    Returns:
        True if stored successfully, False on error
    """
    user_masked = mask_id(user_id)
    key_masked = mask_key(key)

    logger.info(f"[IDEMP] STORE START user={user_masked} key={key_masked} task={task_id}")

    try:
        client = get_service_client()
        payload_hash = _hash_payload(payload)

        insert_data = {
            "user_id": user_id,
            "idempotency_key": key,
            "payload_hash": payload_hash,
            "task_id": task_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        logger.debug(f"[IDEMP] Inserting: {insert_data}")

        client.table("idempotency_keys").insert(insert_data).execute()

        logger.info(
            f"[IDEMP] STORED user={user_masked} key={key_masked} → task={task_id} (TTL={IDEMPOTENCY_TTL_HOURS}h)"
        )
        return True

    except Exception as e:
        error_str = str(e).lower()
        # Handle duplicate key - this is OK, means key already stored
        if "duplicate" in error_str or "unique" in error_str or "23505" in error_str:
            logger.info(f"[IDEMP] Key already exists (duplicate) - OK")
            return True

        logger.error(f"[IDEMP] DB error during store: {e}")
        logger.debug(f"[IDEMP] Store traceback: {traceback.format_exc()}")
        return False


async def cleanup_expired_keys() -> int:
    """
    Delete expired idempotency keys.

    Can be called via cron job or admin endpoint.

    Returns:
        Number of deleted keys
    """
    try:
        client = get_service_client()
        cutoff = _get_ttl_cutoff()

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
