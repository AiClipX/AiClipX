import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, HTTPException as FastAPIHTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from starlette.middleware.base import BaseHTTPMiddleware

from contextlib import asynccontextmanager

from database import close_db, init_db
from generate_video import generate_video
from routers import video_tasks


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - startup and shutdown."""
    # Startup
    await init_db()
    yield
    # Shutdown
    await close_db()

# Setup logging
logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

VERSION = "0.5.0"

app = FastAPI(title="AiClipX", version=VERSION, lifespan=lifespan)

# Request ID middleware (BE-STG8: reuse client's X-Request-Id if provided)
class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Reuse client's X-Request-Id if provided, otherwise generate new one
        client_request_id = request.headers.get("X-Request-Id")
        if client_request_id and len(client_request_id) <= 64:
            request_id = client_request_id
        else:
            request_id = f"req_{uuid4().hex[:8]}"

        request.state.request_id = request_id
        logger.info(f"[{request_id}] {request.method} {request.url.path}")

        response = await call_next(request)
        response.headers["X-Request-Id"] = request_id
        logger.info(f"[{request_id}] Response: {response.status_code}")
        return response


# Add middlewares (order matters - first added = outermost)
app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-Id"],
)

# Include video tasks router
app.include_router(video_tasks.router, prefix="/api")


# Standard error response model
class ErrorResponse(BaseModel):
    code: str
    message: str
    requestId: str


# Exception handlers for standard error format
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", "unknown")
    logger.error(f"[{request_id}] Unhandled error: {exc}")
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
    logger.warning(f"[{request_id}] HTTP {exc.status_code}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": f"HTTP_{exc.status_code}",
            "message": str(exc.detail),
            "requestId": request_id,
            "details": {},
        },
        headers={"X-Request-Id": request_id},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", "unknown")
    errors = exc.errors()
    logger.warning(f"[{request_id}] Validation error: {errors}")

    # Extract first error for human-readable message
    first_error = errors[0] if errors else {}
    field = ".".join(str(x) for x in first_error.get("loc", []))
    msg = first_error.get("msg", "Validation failed")

    return JSONResponse(
        status_code=422,
        content={
            "code": "VALIDATION_ERROR",
            "message": f"{field}: {msg}",
            "requestId": request_id,
            "details": {"errors": errors},
        },
        headers={"X-Request-Id": request_id},
    )


@app.get("/health")
def health_check():
    """Health check endpoint - returns server status, time, and version."""
    return {
        "ok": True,
        "time": datetime.now(timezone.utc).isoformat(),
        "version": VERSION,
    }
# 静态目录：用于暴露生成的视频文件
Path("outputs").mkdir(exist_ok=True)
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")

class GenReq(BaseModel):
    script: str
    language: str = "zh"
    use_broll: bool = True
    style: str = "douyin_vlog"

@app.get("/")
def root():
    return {"message": f"AiClipX v{VERSION} backend OK"}

@app.post("/generate")
def generate_endpoint(req: GenReq):
    out_path = generate_video(
        script=req.script.strip(),
        language=req.language,
        use_broll=req.use_broll,
        style=req.style
    )
    file_name = Path(out_path).name
    url = f"http://127.0.0.1:8000/outputs/{file_name}"
    return {"ok": True, "file": file_name, "url": url}
