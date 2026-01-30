# -*- coding: utf-8 -*-
"""
Debug endpoints for FE integration troubleshooting (BE-INTEG-001).

These endpoints help diagnose CORS and auth issues quickly without
requiring authentication.

BE-STG12-006: Debug endpoints are blocked in production (return 404).
BE-STG13-017: Added circuit breaker test endpoints.
"""

import logging
import os
import re
from typing import List, Optional

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from services.resilience import runway_circuit_breaker, EngineErrorCode, get_error_message

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/debug", tags=["Debug"])


def _get_environment() -> str:
    """Determine current environment (mirrors main.py logic)."""
    app_env = os.getenv("APP_ENV", "").lower()
    api_base_url = os.getenv("API_BASE_URL", "")
    local_dev = os.getenv("LOCAL_DEV", "").lower() == "true"

    if local_dev or "localhost" in api_base_url:
        return "local"
    if app_env == "staging" or "staging" in api_base_url or "iam2" in api_base_url:
        return "staging"
    if app_env == "production":
        return "production"
    return "staging"


def _block_in_production(request: Request) -> Optional[JSONResponse]:
    """Return 404 response if in production environment."""
    env = _get_environment()
    if env == "production":
        request_id = getattr(request.state, "request_id", "unknown")
        logger.info(f"[{request_id}] GET /api/debug/* blocked (production)")
        return JSONResponse(
            status_code=404,
            content={
                "code": "NOT_FOUND",
                "message": "Not found",
                "requestId": request_id,
            },
            headers={"X-Request-Id": request_id},
        )
    return None


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
**BE-STG12-006:** This endpoint returns 404 in production.
""",
)
async def debug_cors(request: Request):
    """
    Debug CORS configuration - helps FE diagnose CORS failures quickly.

    Returns current CORS settings and whether the request Origin is allowed.
    Origins are masked for security (no full domain exposure).

    BE-STG12-006: Returns 404 in production environment.
    """
    # BE-STG12-006: Block in production
    blocked = _block_in_production(request)
    if blocked:
        return blocked

    request_id = getattr(request.state, "request_id", "unknown")
    origin = request.headers.get("origin") or request.headers.get("Origin")
    environment = _get_environment()

    logger.info(f"[{request_id}] GET /api/debug/cors | env={environment} origin={origin}")

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
    # BE-STG12-006: Vercel regex only in non-production
    allow_regex = r"https://.*\.vercel\.app" if environment != "production" else None
    allowed_methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    allowed_headers = ["Authorization", "Content-Type", "X-Request-Id", "Accept", "Idempotency-Key"]
    expose_headers = ["X-Request-Id"]
    credentials = True

    # Check if origin is allowed
    is_allowed = check_origin_allowed(origin, allowed_origins, allow_regex) if origin else False

    # Log CORS decision
    decision = "ALLOWED" if is_allowed else "BLOCKED"
    logger.info(f"[{request_id}] CORS {decision} | env={environment} origin={origin}")

    # Mask origins for security
    masked_origins = [mask_origin(o) for o in allowed_origins]
    # Add regex pattern indication (only in non-production)
    if environment != "production":
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


# =============================================================================
# BE-STG13-017: Circuit Breaker Test Endpoints
# =============================================================================


@router.get("/circuit-breaker")
async def get_circuit_breaker_status(request: Request):
    """
    BE-STG13-017: Get circuit breaker status for testing.

    Returns current state, failure count, and threshold.
    """
    blocked = _block_in_production(request)
    if blocked:
        return blocked

    request_id = getattr(request.state, "request_id", "unknown")
    status = runway_circuit_breaker.get_status()
    status["requestId"] = request_id

    logger.info(f"[{request_id}] GET /api/debug/circuit-breaker → {status['state']}")
    return status


@router.post("/circuit-breaker/record-failure")
async def record_circuit_failure(request: Request):
    """
    BE-STG13-017: Simulate a failure to test circuit breaker.

    Call this 5 times to trigger OPEN state.
    """
    blocked = _block_in_production(request)
    if blocked:
        return blocked

    request_id = getattr(request.state, "request_id", "unknown")

    runway_circuit_breaker.record_failure()
    status = runway_circuit_breaker.get_status()

    logger.warning(f"[{request_id}] POST /api/debug/circuit-breaker/record-failure → {status['state']}")

    return {
        "requestId": request_id,
        "message": "Failure recorded",
        "circuitBreaker": status,
    }


@router.post("/circuit-breaker/record-success")
async def record_circuit_success(request: Request):
    """
    BE-STG13-017: Simulate a success to test circuit breaker recovery.

    Resets failure count and closes circuit.
    """
    blocked = _block_in_production(request)
    if blocked:
        return blocked

    request_id = getattr(request.state, "request_id", "unknown")

    runway_circuit_breaker.record_success()
    status = runway_circuit_breaker.get_status()

    logger.info(f"[{request_id}] POST /api/debug/circuit-breaker/record-success → {status['state']}")

    return {
        "requestId": request_id,
        "message": "Success recorded",
        "circuitBreaker": status,
    }


@router.post("/circuit-breaker/reset")
async def reset_circuit_breaker(request: Request):
    """
    BE-STG13-017: Reset circuit breaker to CLOSED state.

    Use this to restore normal operation after testing.
    """
    blocked = _block_in_production(request)
    if blocked:
        return blocked

    request_id = getattr(request.state, "request_id", "unknown")

    runway_circuit_breaker.reset()
    status = runway_circuit_breaker.get_status()

    logger.info(f"[{request_id}] POST /api/debug/circuit-breaker/reset → {status['state']}")

    return {
        "requestId": request_id,
        "message": "Circuit breaker reset to CLOSED",
        "circuitBreaker": status,
    }
