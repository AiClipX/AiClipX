"""
Video Task Service - Database-backed persistence layer.
All operations read/write from PostgreSQL database.
"""
import asyncio
import base64
import logging
import random
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from uuid import uuid4

from database import database
from models.video_task import VideoTask, VideoTaskStatus

logger = logging.getLogger(__name__)


def encode_cursor(
    created_at: datetime,
    task_id: str,
    q: Optional[str] = None,
    status: Optional[str] = None,
    sort: str = "createdAt_desc",
) -> str:
    """
    Encode cursor as base64 string with filter context.
    Format: createdAt|id|q|status|sort
    """
    raw = f"{created_at.isoformat()}|{task_id}|{q or ''}|{status or ''}|{sort}"
    return base64.urlsafe_b64encode(raw.encode()).decode()


def decode_cursor(cursor: str) -> Optional[Tuple[datetime, str, Optional[str], Optional[str], Optional[str]]]:
    """
    Decode cursor from base64 string.
    Returns: (created_at, task_id, q, status, sort) or None if invalid.
    """
    try:
        raw = base64.urlsafe_b64decode(cursor.encode()).decode()
        parts = raw.split("|")

        if len(parts) == 2:
            # Legacy format - treat as expired
            return None

        if len(parts) == 5:
            created_at = datetime.fromisoformat(parts[0])
            task_id = parts[1]
            q = parts[2] if parts[2] else None
            status = parts[3] if parts[3] else None
            sort = parts[4]
            return created_at, task_id, q, status, sort

        return None
    except Exception:
        return None

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
        cursor_time: Optional[datetime] = None,
        cursor_id: Optional[str] = None,
        status: Optional[str] = None,
        q: Optional[str] = None,
        sort: str = "createdAt_desc",
    ) -> Tuple[List[VideoTask], Optional[str]]:
        """
        Get paginated list of video tasks from database.

        Args:
            limit: Number of tasks to return (1-100)
            cursor_time: Decoded cursor timestamp
            cursor_id: Decoded cursor task ID
            status: Filter by status (pending|processing|completed|failed)
            q: Search in title (ILIKE) or id (exact). Empty/whitespace = no filter.
            sort: Sort order (createdAt_desc|createdAt_asc)

        Returns:
            Tuple of (tasks list, next cursor or None)
        """
        # Build dynamic query
        conditions = []
        params = {"limit": limit}

        # Normalize q: trim whitespace, treat empty as None
        if q:
            q = q.strip()
            if not q:
                q = None

        # Determine sort order
        is_desc = sort == "createdAt_desc"
        order_clause = "created_at DESC, id DESC" if is_desc else "created_at ASC, id ASC"
        cursor_op = "<" if is_desc else ">"

        # Cursor condition (composite key for stable pagination)
        if cursor_time and cursor_id:
            conditions.append(f"(created_at, id) {cursor_op} (:cursor_time, :cursor_id)")
            params["cursor_time"] = cursor_time
            params["cursor_id"] = cursor_id

        # Status filter
        if status:
            conditions.append("status = :status")
            params["status"] = status

        # Search: title (ILIKE) OR id (exact match)
        if q:
            conditions.append("(title ILIKE :q_like OR id = :q_exact)")
            params["q_like"] = f"%{q}%"
            params["q_exact"] = q

        # Build WHERE clause
        where_clause = " AND ".join(conditions) if conditions else "1=1"

        # Execute query
        query = f"""
            SELECT id, title, status, created_at, updated_at, video_url, error_message
            FROM video_tasks
            WHERE {where_clause}
            ORDER BY {order_clause}
            LIMIT :limit
        """
        rows = await database.fetch_all(query, params)
        tasks = [self._row_to_task(row) for row in rows]

        # Calculate next cursor
        next_cursor = None
        if tasks and len(tasks) == limit:
            last_task = tasks[-1]
            # Check if there are more tasks with same filters
            check_params = {"created_at": last_task.createdAt, "id": last_task.id}
            check_conditions = [f"(created_at, id) {cursor_op} (:created_at, :id)"]

            if status:
                check_conditions.append("status = :status")
                check_params["status"] = status
            if q:
                check_conditions.append("(title ILIKE :q_like OR id = :q_exact)")
                check_params["q_like"] = f"%{q}%"
                check_params["q_exact"] = q

            check_where = " AND ".join(check_conditions)
            check_query = f"SELECT 1 FROM video_tasks WHERE {check_where} LIMIT 1"
            has_more = await database.fetch_one(check_query, check_params)

            if has_more:
                next_cursor = encode_cursor(
                    last_task.createdAt, last_task.id,
                    q=q, status=status, sort=sort
                )

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
            updatedAt=now,
            progress=0,
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

    async def delete_task(self, task_id: str) -> bool:
        """
        Delete a video task by ID (hard delete).

        Args:
            task_id: Task ID to delete

        Returns:
            True if task was deleted, False if not found
        """
        query = "DELETE FROM video_tasks WHERE id = :id"
        result = await database.execute(query, {"id": task_id})

        if result:
            logger.info(f"[DB] Deleted task {task_id}")
            return True
        return False

    def _calculate_progress(self, status: VideoTaskStatus) -> int:
        """Calculate progress percentage based on status."""
        progress_map = {
            VideoTaskStatus.pending: 0,
            VideoTaskStatus.processing: 50,
            VideoTaskStatus.completed: 100,
            VideoTaskStatus.failed: 0,
        }
        return progress_map.get(status, 0)

    def _row_to_task(self, row) -> VideoTask:
        """Convert database row to VideoTask model."""
        status = VideoTaskStatus(row["status"])
        return VideoTask(
            id=row["id"],
            title=row["title"],  # Can be None
            status=status,
            createdAt=row["created_at"],
            videoUrl=row["video_url"],
            errorMessage=row["error_message"],
            updatedAt=row["updated_at"],
            progress=self._calculate_progress(status),
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
