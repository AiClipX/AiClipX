# -*- coding: utf-8 -*-
"""
Common utility functions for the AiClipX backend.

This module consolidates duplicated helper functions to follow DRY principles.
All utilities maintain backward compatibility with existing behavior.
"""

from typing import Optional

from fastapi import Request


def mask_id(value: Optional[str], visible_chars: int = 8) -> str:
    """
    Mask a sensitive ID for safe logging.

    Args:
        value: The ID to mask (user_id, task_id, etc.)
        visible_chars: Number of characters to show before "..."

    Returns:
        Masked string like "abc12345..." or "-" if value is None/empty

    Examples:
        >>> mask_id("user_12345678abcd")
        'user_123...'
        >>> mask_id(None)
        '-'
        >>> mask_id("short", visible_chars=10)
        'short'
    """
    if not value:
        return "-"
    if len(value) <= visible_chars:
        return value
    return f"{value[:visible_chars]}..."


def mask_key(value: Optional[str], visible_chars: int = 8) -> str:
    """
    Mask a sensitive key for safe logging (alias for mask_id).

    Semantic alias for masking idempotency keys, API keys, etc.
    """
    return mask_id(value, visible_chars)


def get_client_ip(request: Request) -> str:
    """
    Extract the real client IP from a request.

    Handles proxy headers (X-Forwarded-For) for deployments behind
    load balancers, CDNs, or reverse proxies.

    Args:
        request: FastAPI Request object

    Returns:
        Client IP address string, or "unknown" if not determinable

    Note:
        X-Forwarded-For format: "client, proxy1, proxy2, ..."
        We take the first (leftmost) IP which is the original client.
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
        # The first one is the original client IP
        return forwarded.split(",")[0].strip()

    # Fallback to direct connection IP
    if request.client and request.client.host:
        return request.client.host

    return "unknown"


def get_request_id(request: Request) -> str:
    """
    Extract request ID from request state.

    Args:
        request: FastAPI Request object

    Returns:
        Request ID string, or "unknown" if not set
    """
    return getattr(request.state, "request_id", "unknown")


def truncate_for_log(value: Optional[str], max_length: int = 100) -> str:
    """
    Truncate a string for safe logging (avoid huge log lines).

    Args:
        value: String to truncate
        max_length: Maximum length before truncation

    Returns:
        Truncated string with "..." suffix if needed
    """
    if not value:
        return "-"
    if len(value) <= max_length:
        return value
    return f"{value[:max_length]}..."
