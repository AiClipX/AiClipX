import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query

from models.video_task import (
    CreateVideoTaskRequest,
    CreateVideoTaskResponse,
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
def get_video_tasks(
    limit: int = Query(default=20, ge=1, le=100, description="Number of tasks to return"),
    cursor: Optional[str] = Query(default=None, description="Cursor for pagination"),
) -> VideoTaskListResponse:
    """
    Get paginated list of video tasks.

    - **limit**: Number of tasks (1-100, default 20)
    - **cursor**: ID of last task from previous page
    """
    logger.info("Fetch video tasks list")
    tasks, next_cursor = video_task_service.get_tasks(limit=limit, cursor=cursor)
    logger.info(f"Fetched {len(tasks)} tasks, nextCursor: {next_cursor}")

    for t in tasks:
        logger.info(f"Task {t.id}: status={t.status.value}")

    return VideoTaskListResponse(data=tasks, nextCursor=next_cursor)


@router.post("", response_model=CreateVideoTaskResponse, status_code=201)
async def create_video_task(
    request: CreateVideoTaskRequest,
    background_tasks: BackgroundTasks,
) -> CreateVideoTaskResponse:
    """
    Create a new video task.

    - **title**: Description of the video to generate

    Returns the created task with pending status.
    Status will transition: pending -> processing (5s) -> completed/failed (15s)
    """
    logger.info(f"Creating video task: {request.title[:50]}...")
    task = video_task_service.create_task(title=request.title)
    logger.info(f"Created task {task.id} with status={task.status.value}")

    # Schedule background processing simulation
    background_tasks.add_task(
        simulate_task_processing,
        task.id,
        video_task_service,
    )
    logger.info(f"Scheduled background processing for task {task.id}")

    return CreateVideoTaskResponse(
        id=task.id,
        status=task.status,
        createdAt=task.createdAt,
    )


@router.get("/{task_id}", response_model=VideoTask)
def get_video_task(task_id: str) -> VideoTask:
    """
    Get a single video task by ID.

    - **task_id**: Unique task identifier (e.g., task_001)
    """
    logger.info(f"Fetch video task {task_id}")
    task = video_task_service.get_task_by_id(task_id)

    if not task:
        logger.info(f"Task not found: {task_id}")
        raise HTTPException(status_code=404, detail="Task not found")

    logger.info(f"Task {task.id}: status={task.status.value}")

    if task.status.value == "completed":
        logger.info("Status updated to completed")
        logger.info(f"videoUrl: {task.videoUrl}")
        logger.info("Video URL loaded successfully")
    elif task.status.value == "failed":
        logger.info("Status updated to failed")
        logger.info(f"errorMessage: {task.errorMessage}")

    return task
