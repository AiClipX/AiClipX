"""
Video Tasks API Router - Async endpoints with database persistence.
"""
import asyncio
import logging
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
    limit: int = Query(default=20, ge=1, le=100, description="Number of tasks to return"),
    cursor: Optional[str] = Query(default=None, description="Cursor for pagination"),
) -> VideoTaskListResponse:
    """
    Get paginated list of video tasks.

    - **limit**: Number of tasks (1-100, default 20)
    - **cursor**: ID of last task from previous page
    """
    logger.info("Fetch video tasks list")
    tasks, next_cursor = await video_task_service.get_tasks(limit=limit, cursor=cursor)
    logger.info(f"Fetched {len(tasks)} tasks, nextCursor: {next_cursor}")

    for t in tasks:
        logger.info(f"Task {t.id}: status={t.status.value}")

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
