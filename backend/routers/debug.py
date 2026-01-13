# -*- coding: utf-8 -*-
"""
Debug endpoints for FE integration troubleshooting (BE-INTEG-001).

These endpoints help diagnose CORS and auth issues quickly without
requiring authentication.
"""

import logging
import os
import re
from typing import List, Optional

from fastapi import APIRouter, Request
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/debug", tags=["Debug"])


class CORSDebugResponse(BaseModel):
    """Response schema for CORS debug endpoint."""
    requestId: str
    origin: Optional[str]
    isAllowedOrigin: bool
    allowedOrigins: List[str]
    allowedMethods: List[str]
    allowedHeaders: List[str]
    exposeHeaders: List[str]
    credentials: bool
    environment: str

    model_config = {
        "json_schema_extra": {
            "example": {
                "requestId": "req_abc123",
                "origin": "http://localhost:3000",
                "isAllowedOrigin": True,
                "allowedOrigins": ["https://***clipgo.com", "http://localhost:***"],
                "allowedMethods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                "allowedHeaders": ["Authorization", "Content-Type", "X-Request-Id"],
                "exposeHeaders": ["X-Request-Id"],
                "credentials": True,
                "environment": "staging"
            }
        }
    }


def mask_origin(origin: str) -> str:
    """
    Mask origin for security - hide specific domain details.

    Examples:
        https://www.aiclipgo.com -> https://***clipgo.com
        http://localhost:3000 -> http://localhost:***
        https://app-abc123.vercel.app -> https://***.vercel.app
    """
    # Mask localhost ports
    if "localhost" in origin or "127.0.0.1" in origin:
        return re.sub(r":\d+", ":***", origin)

    # Mask subdomains (www, app, etc.)
    masked = re.sub(r"://[^.]+\.", "://***.", origin)

    # Mask Vercel preview URLs
    if "vercel.app" in origin:
        return re.sub(r"://[^.]+\.vercel\.app", "://***.vercel.app", origin)

    # Mask Render preview URLs
    if "onrender.com" in origin:
        return re.sub(r"://[^.]+\.onrender\.com", "://***.onrender.com", origin)

    return masked


def check_origin_allowed(origin: str, allowed_origins: List[str], allow_regex: Optional[str] = None) -> bool:
    """Check if origin is in allowed list or matches regex."""
    if not origin:
        return False

    # Check exact match
    if origin in allowed_origins:
        return True

    # Check regex pattern (Vercel previews, Render previews)
    if allow_regex:
        try:
            if re.match(allow_regex, origin):
                return True
        except re.error:
            pass

    return False


@router.get(
    "/cors",
    response_model=CORSDebugResponse,
    summary="Debug CORS configuration",
    description="""
Diagnose CORS issues by checking if your origin is allowed.

**Usage:** Call this endpoint from browser console or curl with your Origin header.

```javascript
// Browser console
fetch('https://api.example.com/api/debug/cors', {
  headers: { 'Origin': window.location.origin }
}).then(r => r.json()).then(console.log)
```

**Note:** Allowed origins are partially masked for security.
""",
)
async def debug_cors(request: Request):
    """
    Debug CORS configuration - helps FE diagnose CORS failures quickly.

    Returns current CORS settings and whether the request Origin is allowed.
    Origins are masked for security (no full domain exposure).
    """
    request_id = getattr(request.state, "request_id", "unknown")
    origin = request.headers.get("origin") or request.headers.get("Origin")

    logger.info(f"[{request_id}] GET /api/debug/cors origin={origin}")

    # Get CORS config from environment (same as main.py)
    cors_origins_str = os.getenv("CORS_ORIGINS", "").strip()
    allowed_origins = [o.strip() for o in cors_origins_str.split(",") if o.strip()] if cors_origins_str else [
        "https://www.aiclipgo.com",
        "https://www.aiclipx.app",
    ]

    # Add localhost if LOCAL_DEV or ALLOW_LOCALHOST_CORS is set
    if os.getenv("LOCAL_DEV", "").lower() == "true" or os.getenv("ALLOW_LOCALHOST_CORS", "").lower() == "true":
        allowed_origins.extend(["http://localhost:3000", "http://127.0.0.1:3000"])

    # CORS settings (must match main.py CORSMiddleware config)
    allow_regex = r"https://.*\.vercel\.app"
    allowed_methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    allowed_headers = ["Authorization", "Content-Type", "X-Request-Id", "Accept"]
    expose_headers = ["X-Request-Id"]
    credentials = True

    # Check if origin is allowed
    is_allowed = check_origin_allowed(origin, allowed_origins, allow_regex) if origin else False

    # Determine environment
    api_base_url = os.getenv("API_BASE_URL", "")
    if "localhost" in api_base_url or os.getenv("LOCAL_DEV", "").lower() == "true":
        environment = "local"
    elif "staging" in api_base_url or "iam2" in api_base_url:
        environment = "staging"
    else:
        environment = "production"

    # Mask origins for security
    masked_origins = [mask_origin(o) for o in allowed_origins]
    # Add regex pattern indication
    masked_origins.append("https://***.vercel.app (regex)")

    return CORSDebugResponse(
        requestId=request_id,
        origin=origin,
        isAllowedOrigin=is_allowed,
        allowedOrigins=masked_origins,
        allowedMethods=allowed_methods,
        allowedHeaders=allowed_headers,
        exposeHeaders=expose_headers,
        credentials=credentials,
        environment=environment,
    )
