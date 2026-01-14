"""
Idempotency cache for preventing duplicate task creation.
Uses bounded TTLCache to prevent unbounded memory growth.
"""
import hashlib
import json
import logging
from typing import Optional

from cachetools import TTLCache

logger = logging.getLogger(__name__)

# TTL for idempotency keys (60 minutes)
IDEMPOTENCY_TTL_SECONDS = 60 * 60

# Max cache entries to prevent unbounded memory growth
IDEMPOTENCY_MAX_ENTRIES = 10000

# Bounded TTL cache: auto-expires entries and limits max size
# Structure: {idempotency_key: {"task_id": str, "payload_hash": str}}
_idempotency_cache: TTLCache = TTLCache(
    maxsize=IDEMPOTENCY_MAX_ENTRIES,
    ttl=IDEMPOTENCY_TTL_SECONDS,
)


def _hash_payload(payload: dict) -> str:
    """Create a hash of the request payload for comparison."""
    # Sort keys for consistent hashing
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


def check_idempotency(key: str, payload: dict, user_id: str) -> IdempotencyResult:
    """
    Check if an idempotency key exists and matches payload (per-user scoped).

    Args:
        key: Idempotency-Key header value
        payload: Request body as dict
        user_id: User ID for per-user scoping (BE-STG10-002)

    Returns:
        IdempotencyResult with:
        - hit=True, task_id=X if cache hit and payload matches
        - hit=False, mismatch=True if key exists but payload differs
        - hit=False, mismatch=False if key not found (new key)
    """
    # Per-user scoped cache key (BE-STG10-002)
    cache_key = f"{user_id}:{key}"

    # TTLCache handles expiration automatically
    if cache_key not in _idempotency_cache:
        logger.info(f"[IDEMP] Cache miss for key: {key[:8]}... user: {user_id[:8]}...")
        return IdempotencyResult(hit=False, mismatch=False)

    cached = _idempotency_cache[cache_key]
    payload_hash = _hash_payload(payload)

    if cached["payload_hash"] == payload_hash:
        logger.info(f"[IDEMP] Cache HIT for key: {key[:8]}... user: {user_id[:8]}... → task_id: {cached['task_id']}")
        return IdempotencyResult(hit=True, task_id=cached["task_id"])
    else:
        logger.warning(f"[IDEMP] CONFLICT: Key {key[:8]}... user: {user_id[:8]}... payload mismatch - rejecting")
        return IdempotencyResult(hit=False, mismatch=True)


def store_idempotency(key: str, payload: dict, task_id: str, user_id: str):
    """
    Store idempotency key with task_id and payload hash (per-user scoped).

    Args:
        key: Idempotency-Key header value
        payload: Request body as dict
        task_id: Created task ID
        user_id: User ID for per-user scoping (BE-STG10-002)
    """
    # Per-user scoped cache key (BE-STG10-002)
    cache_key = f"{user_id}:{key}"

    # TTLCache handles expiration automatically
    _idempotency_cache[cache_key] = {
        "task_id": task_id,
        "payload_hash": _hash_payload(payload),
    }
    logger.info(
        f"[IDEMP] Stored key: {key[:8]}... user: {user_id[:8]}... → task_id: {task_id} "
        f"(TTL: 60min, cache size: {len(_idempotency_cache)}/{IDEMPOTENCY_MAX_ENTRIES})"
    )
