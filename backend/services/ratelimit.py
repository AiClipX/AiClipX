# -*- coding: utf-8 -*-
"""
Rate limiting configuration for API endpoints.

Protects expensive operations from abuse:
- Video task creation (uses Runway API credits)
- TTS generation (uses Azure API credits)
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

# Rate limiter using client IP address
# Storage is in-memory by default (consider Redis for production clusters)
limiter = Limiter(key_func=get_remote_address)

# Rate limit constants
# Format: "X per Y" where Y is second, minute, hour, day
RATE_LIMIT_VIDEO_CREATE = "10/minute"  # 10 video tasks per minute per IP
RATE_LIMIT_TTS = "30/minute"           # 30 TTS requests per minute per IP
RATE_LIMIT_DEFAULT = "100/minute"       # Default for other endpoints
