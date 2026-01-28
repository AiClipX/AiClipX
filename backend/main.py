import logging
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from dotenv import load_dotenv

# Load environment variables from .env file (looks in current dir and parent)
load_dotenv()
load_dotenv("../.env")

from fastapi import FastAPI, HTTPException as FastAPIHTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi.errors import RateLimitExceeded

from contextlib import asynccontextmanager

from services.ratelimit import limiter

from database import close_db, init_db, check_db_health
from generate_video import generate_video
from routers import video_tasks, tts, auth, debug, capabilities, audit, assets, templates, events
from services.supabase_client import init_supabase, is_supabase_configured
from services.runway import close_http_client
from services.templates import init_templates


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - startup and shutdown."""
    # Startup - database is REQUIRED (BE-DB-PERSIST-001)
    await init_db()

    # BE-AUTH-001: Initialize Supabase client for auth
    if is_supabase_configured():
        init_supabase()
    else:
        logging.warning("Supabase not configured - auth will not work")

    # BE-STG13-014: Load template catalog
    init_templates()

    yield
    # Shutdown
    await close_http_client()
    await close_db()

# Setup logging with token masking filter
class TokenMaskingFilter(logging.Filter):
    """Filter to mask JWT tokens in log messages (security: BE-STG13-015)."""

    def filter(self, record: logging.LogRecord) -> bool:
        if hasattr(record, 'msg') and isinstance(record.msg, str):
            # Mask JWT tokens in URLs (token=eyJ...)
            import re
            record.msg = re.sub(
                r'(token=)eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+',
                r'\1[MASKED]',
                record.msg
            )
        return True

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")

# Apply token masking filter to uvicorn access logger
for logger_name in ["uvicorn.access", "uvicorn.error", ""]:
    logging.getLogger(logger_name).addFilter(TokenMaskingFilter())

logger = logging.getLogger(__name__)

VERSION = "0.5.0"

# OpenAPI servers configuration (BE-PROD-GATE-001)
API_BASE_URL = os.getenv("API_BASE_URL", "").strip()
openapi_servers = []
if API_BASE_URL:
    openapi_servers.append({"url": API_BASE_URL, "description": "Production"})

app = FastAPI(
    title="AiClipX",
    version=VERSION,
    lifespan=lifespan,
    servers=openapi_servers if openapi_servers else None,
    description="AiClipX Backend API - Video generation and Text-to-Speech services",
)

# Attach rate limiter to app state
app.state.limiter = limiter


# BE-STG11-005: Custom rate limit handler with standard error envelope
async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Return 429 with standard {code, message, requestId} format."""
    request_id = getattr(request.state, "request_id", f"req_{uuid4().hex[:8]}")
    user_id = getattr(request.state, "user_id", None)
    user_masked = user_id[:8] + "..." if user_id else "-"
    origin = request.headers.get("Origin", "-")

    logger.warning(
        f"[{request_id}] ERROR RATE_LIMIT_EXCEEDED: {exc.detail} | "
        f"user={user_masked} origin={origin}"
    )
    return JSONResponse(
        status_code=429,
        content={
            "code": "RATE_LIMIT_EXCEEDED",
            "message": f"Too many requests. {exc.detail}",
            "requestId": request_id,
        },
        headers={"X-Request-Id": request_id},
    )


app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Request ID middleware (BE-STG8: reuse client's X-Request-Id if provided)
# BE-STG11-006: Structured logging with latency, user, origin, idempotency
# BE-STG13-009: API version header + client version logging
from services.capabilities import API_VERSION

class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()

        # Reuse client's X-Request-Id if provided, otherwise generate new one
        client_request_id = request.headers.get("X-Request-Id")
        if client_request_id and len(client_request_id) <= 64:
            request_id = client_request_id
        else:
            request_id = f"req_{uuid4().hex[:8]}"

        # Extract headers for logging
        origin = request.headers.get("Origin", "-")
        idemp_key = request.headers.get("Idempotency-Key", "")
        idemp_prefix = idemp_key[:8] + "..." if idemp_key else "-"

        # BE-STG13-009: Client version header
        client_version = request.headers.get("X-AiClipX-Client-Version", "")

        request.state.request_id = request_id
        request.state.start_time = start_time

        response = await call_next(request)

        # Calculate latency
        latency_ms = int((time.time() - start_time) * 1000)

        # Get user_id if authenticated (set by auth dependency)
        user_id = getattr(request.state, "user_id", None)
        user_masked = user_id[:8] + "..." if user_id else "-"

        # BE-STG13-009: Include client version in log if provided
        client_ver_log = f" client={client_version}" if client_version else ""

        # Structured log line
        logger.info(
            f"[{request_id}] {request.method} {request.url.path} "
            f"→ {response.status_code} | {latency_ms}ms | "
            f"user={user_masked} origin={origin} idemp={idemp_prefix}{client_ver_log}"
        )

        response.headers["X-Request-Id"] = request_id
        # BE-STG13-009: API version header on all responses
        response.headers["X-AiClipX-Api-Version"] = str(API_VERSION)
        return response


# CORS Configuration (BE-PROD-GATE-001, BE-STG12-006)
# Determine environment for CORS policy
APP_ENV = os.getenv("APP_ENV", "").lower()
API_BASE_URL = os.getenv("API_BASE_URL", "")
LOCAL_DEV = os.getenv("LOCAL_DEV", "").lower() == "true"

def get_environment() -> str:
    """Determine current environment: local, staging, or production."""
    if LOCAL_DEV or "localhost" in API_BASE_URL:
        return "local"
    if APP_ENV == "staging" or "staging" in API_BASE_URL or "iam2" in API_BASE_URL:
        return "staging"
    if APP_ENV == "production":
        return "production"
    # Default to staging for safety (more permissive than prod)
    return "staging"

ENVIRONMENT = get_environment()
logger.info(f"Environment: {ENVIRONMENT}")

# Production origins from env var, fallback to restrictive default
CORS_ORIGINS_STR = os.getenv("CORS_ORIGINS", "").strip()
CORS_ORIGINS = [origin.strip() for origin in CORS_ORIGINS_STR.split(",") if origin.strip()] if CORS_ORIGINS_STR else [
    "https://www.aiclipgo.com",
    "https://www.aiclipx.app",
]

# Add localhost for development if LOCAL_DEV=true or ALLOW_LOCALHOST_CORS=true
if LOCAL_DEV or os.getenv("ALLOW_LOCALHOST_CORS", "").lower() == "true":
    CORS_ORIGINS.extend(["http://localhost:3000", "http://127.0.0.1:3000"])

logger.info(f"CORS origins: {CORS_ORIGINS}")

# BE-STG12-006: Vercel regex only in non-production environments
# Production should only allow explicitly listed domains
CORS_ORIGIN_REGEX = None
if ENVIRONMENT != "production":
    CORS_ORIGIN_REGEX = r"https://.*\.vercel\.app"
    logger.info(f"CORS regex enabled (non-prod): {CORS_ORIGIN_REGEX}")
else:
    logger.info("CORS regex disabled (production - explicit origins only)")

# Add middlewares (order matters - first added = outermost)
app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-Id", "Accept", "Idempotency-Key", "X-AiClipX-Client-Version"],
    expose_headers=["X-Request-Id", "X-AiClipX-Api-Version"],
)

# Include routers
app.include_router(video_tasks.router, prefix="/api")
app.include_router(tts.router, prefix="/api")
app.include_router(auth.router, prefix="/api")  # BE-AUTH-002
app.include_router(debug.router, prefix="/api")  # BE-INTEG-001
app.include_router(capabilities.router, prefix="/api")  # BE-STG13-009
app.include_router(audit.router, prefix="/api")  # BE-STG13-012
app.include_router(assets.router, prefix="/api")  # BE-STG13-013
app.include_router(templates.router, prefix="/api")  # BE-STG13-014
app.include_router(events.router, prefix="/api")  # BE-STG13-015


# Standard error response model
class ErrorResponse(BaseModel):
    code: str
    message: str
    requestId: str


# Exception handlers for standard error format
# BE-STG11-006: Structured error logging with category
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", "unknown")
    user_id = getattr(request.state, "user_id", None)
    user_masked = user_id[:8] + "..." if user_id else "-"
    origin = request.headers.get("Origin", "-")

    logger.error(
        f"[{request_id}] ERROR INTERNAL_ERROR: {type(exc).__name__} | "
        f"user={user_masked} origin={origin}"
    )
    return JSONResponse(
        status_code=500,
        content={
            "code": "INTERNAL_ERROR",
            "message": "An unexpected error occurred",
            "requestId": request_id,
            "details": {},
        },
        headers={"X-Request-Id": request_id},
    )


@app.exception_handler(FastAPIHTTPException)
async def http_exception_handler(request: Request, exc: FastAPIHTTPException):
    request_id = getattr(request.state, "request_id", "unknown")
    user_id = getattr(request.state, "user_id", None)
    user_masked = user_id[:8] + "..." if user_id else "-"
    origin = request.headers.get("Origin", "-")

    # BE-STG12-005: Semantic error codes for auth errors
    code_map = {
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        429: "RATE_LIMITED",
    }
    error_code = code_map.get(exc.status_code, f"HTTP_{exc.status_code}")

    logger.warning(
        f"[{request_id}] ERROR {error_code}: {exc.detail} | "
        f"user={user_masked} origin={origin}"
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": error_code,
            "message": str(exc.detail),
            "requestId": request_id,
            "details": {},
        },
        headers={"X-Request-Id": request_id},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", "unknown")
    user_id = getattr(request.state, "user_id", None)
    user_masked = user_id[:8] + "..." if user_id else "-"
    origin = request.headers.get("Origin", "-")

    errors = exc.errors()

    # Extract first error for human-readable message
    first_error = errors[0] if errors else {}
    field = ".".join(str(x) for x in first_error.get("loc", []))
    msg = first_error.get("msg", "Validation failed")

    logger.warning(
        f"[{request_id}] ERROR VALIDATION_ERROR: {field}: {msg} | "
        f"user={user_masked} origin={origin}"
    )

    # Convert errors to JSON-serializable format
    serializable_errors = [
        {
            "loc": list(e.get("loc", [])),
            "msg": str(e.get("msg", "")),
            "type": str(e.get("type", "")),
        }
        for e in errors
    ]

    return JSONResponse(
        status_code=422,
        content={
            "code": "VALIDATION_ERROR",
            "message": f"{field}: {msg}",
            "requestId": request_id,
            "details": {"errors": serializable_errors},
        },
        headers={"X-Request-Id": request_id},
    )


@app.get("/health")
async def health_check():
    """Health check endpoint - returns server status, time, version, and DB status."""
    db_ok = await check_db_health()

    response_body = {
        "ok": db_ok,
        "db": "ok" if db_ok else "error",
        "time": datetime.now(timezone.utc).isoformat(),
        "version": VERSION,
    }

    if not db_ok:
        return JSONResponse(status_code=503, content=response_body)

    return response_body
# 静态目录：用于暴露生成的视频文件
Path("outputs").mkdir(exist_ok=True)
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")

class GenReq(BaseModel):
    script: str
    language: str = "zh"
    use_broll: bool = True
    style: str = "douyin_vlog"

@app.api_route("/", methods=["GET", "HEAD"])
def root():
    """Root endpoint - responds to both GET and HEAD (BE-ENGINE-002: Render health check)."""
    return {"message": f"AiClipX v{VERSION} backend OK"}

@app.post("/generate", include_in_schema=False, deprecated=True)
def generate_endpoint(req: GenReq):
    """DEPRECATED: Use POST /api/video-tasks instead. This endpoint is for internal/legacy use only."""
    out_path = generate_video(
        script=req.script.strip(),
        language=req.language,
        use_broll=req.use_broll,
        style=req.style
    )
    file_name = Path(out_path).name
    url = f"http://127.0.0.1:8000/outputs/{file_name}"
    return {"ok": True, "file": file_name, "url": url}
