# -*- coding: utf-8 -*-
"""
Rate limiting configuration for API endpoints.

Protects expensive operations from abuse:
- Video task creation (uses Runway API credits)
- TTS generation (uses Azure API credits)
- Auth signin (brute-force prevention)
"""

from slowapi import Limiter
from starlette.requests import Request


def get_real_ip(request: Request) -> str:
    """
    Get real client IP behind proxy (Render, Cloudflare, etc.).
    Uses X-Forwarded-For header if available.
    """
    # X-Forwarded-For: client, proxy1, proxy2
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()

    # Fallback to direct client IP
    if request.client:
        return request.client.host
    return "unknown"


# Rate limiter using real client IP (handles proxies)
limiter = Limiter(key_func=get_real_ip)

# Rate limit constants
# Format: "X per Y" where Y is second, minute, hour, day
RATE_LIMIT_VIDEO_CREATE = "10/minute"  # 10 video tasks per minute per IP
RATE_LIMIT_TTS = "30/minute"           # 30 TTS requests per minute per IP
RATE_LIMIT_DEFAULT = "100/minute"       # Default for other endpoints
RATE_LIMIT_AUTH_SIGNIN = "10/minute"   # BE-STG11-005: 10 signin attempts per minute per IP

# BE-STG13-008: Concurrency limit per user
MAX_CONCURRENT_TASKS_PER_USER = 3  # Max tasks in queued/processing state per user
