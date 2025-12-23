from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from models.video_task import VideoTask, VideoTaskListResponse
from services.video_task_service import video_task_service

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
    tasks, next_cursor = video_task_service.get_tasks(limit=limit, cursor=cursor)
    return VideoTaskListResponse(data=tasks, nextCursor=next_cursor)


@router.get("/{task_id}", response_model=VideoTask)
def get_video_task(task_id: str) -> VideoTask:
    """
    Get a single video task by ID.

    - **task_id**: Unique task identifier (e.g., task_001)
    """
    task = video_task_service.get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task
