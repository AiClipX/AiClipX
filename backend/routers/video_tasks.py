"""
Video Tasks API Router - Async endpoints with database persistence.
"""
import asyncio
import logging
import time
from typing import Optional

from fastapi import APIRouter, Header, Query, Request, Response
from fastapi.responses import JSONResponse

from models.video_task import (
    CreateVideoTaskRequest,
    DebugInfo,
    VideoTask,
    VideoTaskListResponse,
)
from services.idempotency import check_idempotency, store_idempotency
from services.video_task_service import (
    simulate_task_processing,
    video_task_service,
)

# Setup logging
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/video-tasks", tags=["Video Tasks"])


@router.get("", response_model=VideoTaskListResponse)
async def get_video_tasks(
    request: Request,
    limit: int = Query(default=20, ge=1, le=50, description="Number of tasks to return (max 50)"),
    cursor: Optional[str] = Query(default=None, description="Opaque cursor for pagination"),
    status: Optional[str] = Query(
        default=None,
        pattern="^(pending|processing|completed|failed)$",
        description="Filter by status",
    ),
    q: Optional[str] = Query(default=None, max_length=100, description="Search in title"),
    sort: str = Query(
        default="createdAt_desc",
        pattern="^createdAt_(desc|asc)$",
        description="Sort order: createdAt_desc or createdAt_asc",
    ),
) -> VideoTaskListResponse:
    """
    Get paginated list of video tasks with filtering and sorting.

    - **limit**: Number of tasks (1-50, default 20)
    - **cursor**: Opaque cursor from previous response's nextCursor
    - **status**: Filter by status (pending|processing|completed|failed)
    - **q**: Search in title (case-insensitive)
    - **sort**: Sort order (createdAt_desc|createdAt_asc, default desc)
    """
    start_time = time.perf_counter()
    request_id = getattr(request.state, "request_id", "unknown")

    # Log request with all params
    logger.info(
        f"[{request_id}] GET /api/video-tasks "
        f"limit={limit} cursor={cursor} status={status} q={q} sort={sort}"
    )

    tasks, next_cursor = await video_task_service.get_tasks(
        limit=limit,
        cursor=cursor,
        status=status,
        q=q,
        sort=sort,
    )

    # Calculate latency
    latency_ms = int((time.perf_counter() - start_time) * 1000)
    logger.info(
        f"[{request_id}] Fetched {len(tasks)} tasks, nextCursor={next_cursor}, latency={latency_ms}ms"
    )

    return VideoTaskListResponse(data=tasks, nextCursor=next_cursor)


@router.post(
    "",
    response_model=VideoTask,
    status_code=201,
    responses={
        201: {"description": "Task created successfully"},
        409: {
            "description": "Idempotency-Key already used with different payload",
            "content": {
                "application/json": {
                    "example": {
                        "code": "IDEMPOTENCY_KEY_CONFLICT",
                        "message": "Idempotency-Key already used with different payload",
                        "requestId": "req_xxx",
                    }
                }
            },
        },
    },
)
async def create_video_task(
    request_body: CreateVideoTaskRequest,
    request: Request,
    idempotency_key: Optional[str] = Header(
        default=None,
        alias="Idempotency-Key",
        description="Optional key to prevent duplicate task creation (valid for 60 minutes). "
        "If the same key is used with a different payload, returns 409 Conflict.",
    ),
) -> VideoTask:
    """
    Create a new video task.

    - **title**: Optional title/description (max 500 chars)
    - **prompt**: Optional prompt for video generation (max 2000 chars)
    - **Idempotency-Key** header: Optional, prevents duplicate creation for 60 minutes.
      Same key + same payload = returns existing task. Same key + different payload = 409 Conflict.

    Returns the created task with pending status.
    Status will transition: pending -> processing (5s) -> completed (20s)
    """
    request_id = getattr(request.state, "request_id", "unknown")
    title_log = (request_body.title[:50] + "...") if request_body.title else "(no title)"
    logger.info(f"[{request_id}] Creating video task: {title_log}")

    # Check idempotency if key provided
    if idempotency_key:
        payload = {"title": request_body.title, "prompt": request_body.prompt}
        idemp_result = check_idempotency(idempotency_key, payload)

        # Payload mismatch → 409 Conflict
        if idemp_result.mismatch:
            logger.warning(
                f"[{request_id}] Idempotency CONFLICT: key {idempotency_key[:8]}... "
                "used with different payload - returning 409"
            )
            return JSONResponse(
                status_code=409,
                content={
                    "code": "IDEMPOTENCY_KEY_CONFLICT",
                    "message": "Idempotency-Key already used with different payload",
                    "requestId": request_id,
                },
                headers={"X-Request-Id": request_id},
            )

        # Cache hit with matching payload → return existing task
        if idemp_result.hit and idemp_result.task_id:
            logger.info(f"[{request_id}] Idempotency hit: returning existing task {idemp_result.task_id}")
            task = await video_task_service.get_task_by_id(idemp_result.task_id)
            if task:
                task.debug = DebugInfo(requestId=request_id)
                return task

    # Create new task
    task = await video_task_service.create_task(
        title=request_body.title,
        prompt=request_body.prompt,
    )
    logger.info(f"[{request_id}] Created task {task.id} with status={task.status.value}")

    # Store idempotency key if provided
    if idempotency_key:
        payload = {"title": request_body.title, "prompt": request_body.prompt}
        store_idempotency(idempotency_key, payload, task.id)

    # Schedule background processing simulation using asyncio.create_task
    asyncio.create_task(simulate_task_processing(task.id, video_task_service))
    logger.info(f"[{request_id}] Scheduled background processing for task {task.id}")

    # Add debug info
    task.debug = DebugInfo(requestId=request_id)

    return task


@router.get("/{task_id}", response_model=VideoTask)
async def get_video_task(task_id: str, request: Request) -> VideoTask:
    """
    Get a single video task by ID.

    - **task_id**: Unique task identifier (e.g., vt_abc12345)

    Response includes diagnostic fields:
    - **updatedAt**: Last update timestamp
    - **progress**: 0-100 based on status
    - **debug**: Request tracing info
    """
    request_id = getattr(request.state, "request_id", "unknown")
    logger.info(f"[{request_id}] Fetch video task {task_id}")

    task = await video_task_service.get_task_by_id(task_id)

    if not task:
        logger.info(f"[{request_id}] Task not found: {task_id}")
        return JSONResponse(
            status_code=404,
            content={
                "code": "NOT_FOUND",
                "message": "Video task not found",
                "requestId": request_id,
            },
            headers={"X-Request-Id": request_id},
        )

    # Inject debug info
    task.debug = DebugInfo(requestId=request_id)

    logger.info(f"[{request_id}] Task {task.id}: status={task.status.value}, progress={task.progress}")

    if task.status.value == "completed":
        logger.info(f"[{request_id}] Status: completed, videoUrl: {task.videoUrl}")
    elif task.status.value == "failed":
        logger.info(f"[{request_id}] Status: failed, errorMessage: {task.errorMessage}")

    return task


@router.delete("/{task_id}", status_code=204)
async def delete_video_task(task_id: str, request: Request):
    """
    Delete a video task by ID.

    - **task_id**: Unique task identifier (e.g., vt_abc12345)

    Returns 204 No Content on success, 404 if not found.
    """
    request_id = getattr(request.state, "request_id", "unknown")
    logger.info(f"[{request_id}] DELETE video task {task_id}")

    # Check if task exists
    task = await video_task_service.get_task_by_id(task_id)
    if not task:
        logger.info(f"[{request_id}] Task not found: {task_id}")
        return JSONResponse(
            status_code=404,
            content={
                "code": "NOT_FOUND",
                "message": "Video task not found",
                "requestId": request_id,
            },
            headers={"X-Request-Id": request_id},
        )

    # Delete task
    await video_task_service.delete_task(task_id)
    logger.info(f"[{request_id}] Deleted task {task_id}")

    return Response(status_code=204)
