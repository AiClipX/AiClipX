"""
Video Task Service - Database-backed persistence layer.
All operations read/write from PostgreSQL database.
"""
import asyncio
import logging
import random
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from uuid import uuid4

from database import database
from models.video_task import VideoTask, VideoTaskStatus

logger = logging.getLogger(__name__)

# Demo video URLs for completed tasks
DEMO_VIDEOS = [
    "https://www.w3schools.com/html/mov_bbb.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
]


class VideoTaskService:
    """Service layer for video task CRUD operations using PostgreSQL."""

    async def get_tasks(
        self,
        limit: int = 20,
        cursor: Optional[str] = None
    ) -> Tuple[List[VideoTask], Optional[str]]:
        """
        Get paginated list of video tasks from database.

        Args:
            limit: Number of tasks to return (1-100)
            cursor: Task ID to start after (for pagination)

        Returns:
            Tuple of (tasks list, next cursor or None)
        """
        if cursor:
            # Get the created_at of the cursor task for pagination
            cursor_query = "SELECT created_at FROM video_tasks WHERE id = :cursor"
            cursor_row = await database.fetch_one(cursor_query, {"cursor": cursor})

            if cursor_row:
                query = """
                    SELECT id, title, status, created_at, updated_at, video_url, error_message
                    FROM video_tasks
                    WHERE created_at < :cursor_time
                    ORDER BY created_at DESC
                    LIMIT :limit
                """
                rows = await database.fetch_all(query, {
                    "cursor_time": cursor_row["created_at"],
                    "limit": limit
                })
            else:
                rows = []
        else:
            query = """
                SELECT id, title, status, created_at, updated_at, video_url, error_message
                FROM video_tasks
                ORDER BY created_at DESC
                LIMIT :limit
            """
            rows = await database.fetch_all(query, {"limit": limit})

        tasks = [self._row_to_task(row) for row in rows]

        # Calculate next cursor
        next_cursor = None
        if tasks and len(tasks) == limit:
            # Check if there are more tasks
            last_task = tasks[-1]
            check_query = """
                SELECT 1 FROM video_tasks
                WHERE created_at < :created_at
                LIMIT 1
            """
            has_more = await database.fetch_one(check_query, {"created_at": last_task.createdAt})
            if has_more:
                next_cursor = last_task.id

        return tasks, next_cursor

    async def get_task_by_id(self, task_id: str) -> Optional[VideoTask]:
        """Get a single video task by ID from database."""
        query = """
            SELECT id, title, status, created_at, updated_at, video_url, error_message
            FROM video_tasks
            WHERE id = :id
        """
        row = await database.fetch_one(query, {"id": task_id})

        if row:
            return self._row_to_task(row)
        return None

    async def create_task(
        self,
        title: Optional[str] = None,
        prompt: Optional[str] = None,
    ) -> VideoTask:
        """
        Create a new video task with pending status.

        Args:
            title: Task title/description (optional)
            prompt: Task prompt for generation (optional)

        Returns:
            Created VideoTask instance
        """
        task_id = f"vt_{uuid4().hex[:8]}"
        now = datetime.now(timezone.utc)

        query = """
            INSERT INTO video_tasks (id, title, prompt, status, created_at, updated_at)
            VALUES (:id, :title, :prompt, :status, :created_at, :updated_at)
        """
        await database.execute(query, {
            "id": task_id,
            "title": title,
            "prompt": prompt,
            "status": VideoTaskStatus.pending.value,
            "created_at": now,
            "updated_at": now,
        })

        logger.info(f"[DB] Inserted task {task_id} with status=pending")

        return VideoTask(
            id=task_id,
            title=title,
            status=VideoTaskStatus.pending,
            createdAt=now,
            videoUrl=None,
            errorMessage=None,
        )

    async def update_task_status(
        self,
        task_id: str,
        status: VideoTaskStatus,
        video_url: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> Optional[VideoTask]:
        """Update task status and related fields in database."""
        now = datetime.now(timezone.utc)

        query = """
            UPDATE video_tasks
            SET status = :status,
                updated_at = :updated_at,
                video_url = COALESCE(:video_url, video_url),
                error_message = COALESCE(:error_message, error_message)
            WHERE id = :id
        """
        await database.execute(query, {
            "id": task_id,
            "status": status.value,
            "updated_at": now,
            "video_url": video_url,
            "error_message": error_message,
        })

        logger.info(f"[DB] Updated task {task_id} status={status.value}")

        return await self.get_task_by_id(task_id)

    def _row_to_task(self, row) -> VideoTask:
        """Convert database row to VideoTask model."""
        return VideoTask(
            id=row["id"],
            title=row["title"],  # Can be None
            status=VideoTaskStatus(row["status"]),
            createdAt=row["created_at"],
            videoUrl=row["video_url"],
            errorMessage=row["error_message"],
        )


async def simulate_task_processing(task_id: str, service: VideoTaskService):
    """
    Background function to simulate task status transitions.
    pending -> processing (after 5s) -> completed (after 15s)
    All transitions are persisted to database.
    """
    try:
        # Wait 5s then transition to processing
        await asyncio.sleep(5)
        await service.update_task_status(task_id, VideoTaskStatus.processing)
        logger.info(f"[BG] Task {task_id} transitioned to processing")

        # Wait 15s then transition to completed
        await asyncio.sleep(15)
        video_url = random.choice(DEMO_VIDEOS)
        await service.update_task_status(
            task_id,
            VideoTaskStatus.completed,
            video_url=video_url,
        )
        logger.info(f"[BG] Task {task_id} transitioned to completed with videoUrl")
    except Exception as e:
        logger.error(f"[BG] Error processing task {task_id}: {e}")
        try:
            await service.update_task_status(
                task_id,
                VideoTaskStatus.failed,
                error_message=f"Processing error: {str(e)}",
            )
        except Exception as update_err:
            logger.error(f"[BG] Failed to update task {task_id} to failed: {update_err}")


# Singleton instance
video_task_service = VideoTaskService()
