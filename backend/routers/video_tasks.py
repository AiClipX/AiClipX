"""
Video Tasks API Router - Async endpoints with database persistence.
"""
import asyncio
import logging
import time
from typing import Optional

from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse

from models.video_task import (
    CreateVideoTaskRequest,
    VideoTask,
    VideoTaskListResponse,
)
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


@router.post("", response_model=VideoTask, status_code=201)
async def create_video_task(
    request_body: CreateVideoTaskRequest,
    request: Request,
) -> VideoTask:
    """
    Create a new video task.

    - **title**: Optional title/description (max 500 chars)
    - **prompt**: Optional prompt for video generation (max 2000 chars)

    Returns the created task with pending status.
    Status will transition: pending -> processing (5s) -> completed (20s)
    """
    request_id = getattr(request.state, "request_id", "unknown")
    title_log = (request_body.title[:50] + "...") if request_body.title else "(no title)"
    logger.info(f"[{request_id}] Creating video task: {title_log}")

    task = await video_task_service.create_task(
        title=request_body.title,
        prompt=request_body.prompt,
    )
    logger.info(f"[{request_id}] Created task {task.id} with status={task.status.value}")

    # Schedule background processing simulation using asyncio.create_task
    asyncio.create_task(simulate_task_processing(task.id, video_task_service))
    logger.info(f"[{request_id}] Scheduled background processing for task {task.id}")

    return task


@router.get("/{task_id}", response_model=VideoTask)
async def get_video_task(task_id: str, request: Request) -> VideoTask:
    """
    Get a single video task by ID.

    - **task_id**: Unique task identifier (e.g., vt_abc12345)
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

    logger.info(f"[{request_id}] Task {task.id}: status={task.status.value}")

    if task.status.value == "completed":
        logger.info(f"[{request_id}] Status: completed, videoUrl: {task.videoUrl}")
    elif task.status.value == "failed":
        logger.info(f"[{request_id}] Status: failed, errorMessage: {task.errorMessage}")

    return task
