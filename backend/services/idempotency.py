"""
Idempotency cache for preventing duplicate task creation.
Simple in-memory implementation with TTL.
"""
import hashlib
import logging
import time
from typing import Optional

logger = logging.getLogger(__name__)

# TTL for idempotency keys (60 minutes)
IDEMPOTENCY_TTL_SECONDS = 60 * 60

# In-memory cache: {idempotency_key: {"task_id": str, "payload_hash": str, "expires": float}}
_idempotency_cache: dict = {}


def _hash_payload(payload: dict) -> str:
    """Create a hash of the request payload for comparison."""
    # Sort keys for consistent hashing
    import json
    payload_str = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(payload_str.encode()).hexdigest()[:16]


def _cleanup_expired():
    """Remove expired entries from cache."""
    now = time.time()
    expired_keys = [k for k, v in _idempotency_cache.items() if v["expires"] < now]
    for key in expired_keys:
        del _idempotency_cache[key]
    if expired_keys:
        logger.info(f"[IDEMP] Cleaned up {len(expired_keys)} expired keys")


def check_idempotency(key: str, payload: dict) -> Optional[str]:
    """
    Check if an idempotency key exists and matches payload.

    Args:
        key: Idempotency-Key header value
        payload: Request body as dict

    Returns:
        task_id if cache hit and payload matches, None otherwise
    """
    _cleanup_expired()

    if key not in _idempotency_cache:
        logger.info(f"[IDEMP] Cache miss for key: {key[:8]}...")
        return None

    cached = _idempotency_cache[key]
    payload_hash = _hash_payload(payload)

    if cached["payload_hash"] == payload_hash:
        logger.info(f"[IDEMP] Cache HIT for key: {key[:8]}... → task_id: {cached['task_id']}")
        return cached["task_id"]
    else:
        logger.warning(f"[IDEMP] Key exists but payload mismatch: {key[:8]}...")
        return None


def store_idempotency(key: str, payload: dict, task_id: str):
    """
    Store idempotency key with task_id and payload hash.

    Args:
        key: Idempotency-Key header value
        payload: Request body as dict
        task_id: Created task ID
    """
    _idempotency_cache[key] = {
        "task_id": task_id,
        "payload_hash": _hash_payload(payload),
        "expires": time.time() + IDEMPOTENCY_TTL_SECONDS,
    }
    logger.info(f"[IDEMP] Stored key: {key[:8]}... → task_id: {task_id} (TTL: 60min)")
