"""
Video Task Service - Database-backed persistence layer (BE-AUTH-001).

Uses Supabase client for all database operations:
- User-facing endpoints: user_client with JWT (RLS enforced via auth.uid())
- Background jobs: service_client (bypasses RLS)
"""
import asyncio
import base64
import logging
import random
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from uuid import uuid4

import httpx
import json

from supabase import Client
from models.video_task import VideoTask, VideoTaskStatus, VideoTaskParams
from services.supabase_client import get_service_client
from services.runway import (
    create_image_to_video_task,
    get_task_status,
    RunwayTaskStatus,
    RunwayAPIError,
    RunwayConfigError,
)
from services.supabase_storage import (
    upload_video,
    SupabaseUploadError,
    SupabaseConfigError,
)

logger = logging.getLogger(__name__)

# State machine: allowed transitions
ALLOWED_TRANSITIONS = {
    VideoTaskStatus.queued: [VideoTaskStatus.processing, VideoTaskStatus.failed],
    VideoTaskStatus.processing: [VideoTaskStatus.completed, VideoTaskStatus.failed],
    VideoTaskStatus.completed: [],  # Terminal state
    VideoTaskStatus.failed: [],     # Terminal state
}


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
    """
    Service layer for video task CRUD operations using Supabase client (BE-AUTH-001).

    User-facing methods accept a Supabase client (user_client) for RLS enforcement.
    Background job methods use service_client internally.
    """

    def get_tasks(
        self,
        client: Client,
        limit: int = 20,
        cursor_time: Optional[datetime] = None,
        cursor_id: Optional[str] = None,
        status: Optional[str] = None,
        q: Optional[str] = None,
        sort: str = "createdAt_desc",
    ) -> Tuple[List[VideoTask], Optional[str]]:
        """
        Get paginated list of video tasks from database (RLS enforced).

        Args:
            client: Supabase client (user_client for RLS)
            limit: Number of tasks to return (1-100)
            cursor_time: Decoded cursor timestamp
            cursor_id: Decoded cursor task ID
            status: Filter by status (pending|processing|completed|failed)
            q: Search in title (ILIKE) or id (exact). Empty/whitespace = no filter.
            sort: Sort order (createdAt_desc|createdAt_asc)

        Returns:
            Tuple of (tasks list, next cursor or None)
        """
        # Normalize q: trim whitespace, treat empty as None
        if q:
            q = q.strip()
            if not q:
                q = None

        # Determine sort order
        is_desc = sort == "createdAt_desc"

        # Build query with Supabase client
        query = client.table("video_tasks").select(
            "id, title, prompt, status, created_at, updated_at, video_url, error_message, "
            "source_image_url, engine, params, progress, user_id"
        )

        # Apply cursor pagination
        if cursor_time and cursor_id:
            if is_desc:
                # For descending: get items before cursor
                query = query.or_(
                    f"created_at.lt.{cursor_time.isoformat()},"
                    f"and(created_at.eq.{cursor_time.isoformat()},id.lt.{cursor_id})"
                )
            else:
                # For ascending: get items after cursor
                query = query.or_(
                    f"created_at.gt.{cursor_time.isoformat()},"
                    f"and(created_at.eq.{cursor_time.isoformat()},id.gt.{cursor_id})"
                )

        # Status filter
        if status:
            query = query.eq("status", status)

        # Search: title (ILIKE) OR id (exact match)
        # Escape LIKE wildcards to prevent injection
        if q:
            # Escape special LIKE characters: % _ \
            escaped_q = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            query = query.or_(f"title.ilike.%{escaped_q}%,id.eq.{q}")

        # Apply sort order
        if is_desc:
            query = query.order("created_at", desc=True).order("id", desc=True)
        else:
            query = query.order("created_at", desc=False).order("id", desc=False)

        # Execute with limit + 1 to check if more exist (avoids N+1 query)
        response = query.limit(limit + 1).execute()
        all_tasks = [self._row_to_task(row) for row in response.data]

        # Determine if there are more results
        has_more = len(all_tasks) > limit
        tasks = all_tasks[:limit]  # Return only requested limit

        # Calculate next cursor
        next_cursor = None
        if has_more and tasks:
            last_task = tasks[-1]
            next_cursor = encode_cursor(
                last_task.createdAt, last_task.id,
                q=q, status=status, sort=sort
            )

        return tasks, next_cursor

    def get_task_by_id(self, client: Client, task_id: str) -> Optional[VideoTask]:
        """
        Get a single video task by ID from database (RLS enforced).

        Args:
            client: Supabase client (user_client for RLS)
            task_id: Task ID to fetch

        Returns:
            VideoTask or None if not found
        """
        response = client.table("video_tasks").select(
            "id, title, prompt, status, created_at, updated_at, video_url, error_message, "
            "source_image_url, engine, params, progress, user_id"
        ).eq("id", task_id).execute()

        if response.data:
            return self._row_to_task(response.data[0])
        return None

    def create_task(
        self,
        client: Client,
        user_id: str,
        title: str,
        prompt: str,
        source_image_url: Optional[str] = None,
        engine: str = "mock",
        params: Optional[dict] = None,
    ) -> VideoTask:
        """
        Create a new video task with queued status (BE-AUTH-001).

        Args:
            client: Supabase client (user_client for RLS)
            user_id: User ID from JWT (required for RLS)
            title: Task title (required)
            prompt: Task prompt for generation (required)
            source_image_url: Optional source image URL
            engine: Video engine (runway or mock)
            params: Optional generation parameters

        Returns:
            Created VideoTask instance
        """
        task_id = f"vt_{uuid4().hex[:8]}"
        now = datetime.now(timezone.utc)

        # Insert into database
        data = {
            "id": task_id,
            "user_id": user_id,
            "title": title,
            "prompt": prompt,
            "status": VideoTaskStatus.queued.value,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "source_image_url": source_image_url,
            "engine": engine,
            "params": params,
            "progress": 0,
        }

        response = client.table("video_tasks").insert(data).execute()

        if not response.data:
            raise Exception(f"Failed to create task: {response}")

        logger.info(f"[DB] Inserted task {task_id} with status=queued, engine={engine}, user_id={user_id[:8]}...")

        # Parse params back to model
        params_model = VideoTaskParams(**params) if params else None

        return VideoTask(
            id=task_id,
            title=title,
            prompt=prompt,
            status=VideoTaskStatus.queued,
            createdAt=now,
            updatedAt=now,
            videoUrl=None,
            errorMessage=None,
            progress=0,
            sourceImageUrl=source_image_url,
            engine=engine,
            params=params_model,
        )

    def validate_transition(self, current_status: VideoTaskStatus, new_status: VideoTaskStatus) -> bool:
        """Check if status transition is allowed."""
        allowed = ALLOWED_TRANSITIONS.get(current_status, [])
        return new_status in allowed

    def validate_status_constraints(
        self,
        status: VideoTaskStatus,
        progress: Optional[int],
        video_url: Optional[str],
        error_message: Optional[str],
    ) -> Optional[str]:
        """
        Validate field constraints for each status (BE-ENGINE-002: strict state machine).

        Rules:
        - queued: progress=0, no videoUrl, no errorMessage
        - processing: progress 1-99, no videoUrl, no errorMessage
        - completed: progress=100, videoUrl required, no errorMessage
        - failed: errorMessage required, no videoUrl, progress kept at failure point

        Returns error message if invalid, None if valid.
        """
        if status == VideoTaskStatus.queued:
            if progress is not None and progress != 0:
                return "progress must be 0 for queued status"
            if video_url is not None:
                return "videoUrl must be null for queued status"
            if error_message is not None:
                return "errorMessage must be null for queued status"

        elif status == VideoTaskStatus.processing:
            if video_url is not None:
                return "videoUrl must be null for processing status"
            if error_message is not None:
                return "errorMessage must be null for processing status"
            if progress is not None and progress >= 100:
                return "progress must be 0-99 for processing status"

        elif status == VideoTaskStatus.completed:
            if progress != 100:
                return "progress must be 100 for completed status"
            if not video_url:
                return "videoUrl is required for completed status"
            if error_message is not None:
                return "errorMessage must be null for completed status"

        elif status == VideoTaskStatus.failed:
            if not error_message:
                return "errorMessage is required for failed status"
            if video_url is not None:
                return "videoUrl must be null for failed status"
            # progress: no constraint - keep at failure point for observability

        return None

    def update_task_status(
        self,
        task_id: str,
        status: VideoTaskStatus,
        progress: Optional[int] = None,
        video_url: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> Optional[VideoTask]:
        """
        Update task status and related fields in database.

        Uses service_client (bypasses RLS) for background job updates.
        """
        now = datetime.now(timezone.utc)
        service_client = get_service_client()

        # Build update data
        update_data = {
            "status": status.value,
            "updated_at": now.isoformat(),
        }

        if progress is not None:
            update_data["progress"] = progress
        if video_url is not None:
            update_data["video_url"] = video_url
        if error_message is not None:
            update_data["error_message"] = error_message

        response = service_client.table("video_tasks").update(update_data).eq("id", task_id).execute()

        logger.info(f"[DB] Updated task {task_id} status={status.value} progress={progress}")

        # Fetch updated task
        return self.get_task_by_id(service_client, task_id)

    def delete_task(self, client: Client, task_id: str) -> bool:
        """
        Delete a video task by ID (hard delete, RLS enforced).

        Args:
            client: Supabase client (user_client for RLS)
            task_id: Task ID to delete

        Returns:
            True if task was deleted, False if not found
        """
        # Check if task exists first (RLS enforced)
        existing = self.get_task_by_id(client, task_id)
        if not existing:
            return False

        response = client.table("video_tasks").delete().eq("id", task_id).execute()

        if response.data:
            logger.info(f"[DB] Deleted task {task_id}")
            return True
        return False

    def _row_to_task(self, row: dict) -> VideoTask:
        """Convert database row (dict) to VideoTask model."""
        status = VideoTaskStatus(row["status"])

        # Parse params from JSON (handle both dict and None)
        params_data = row.get("params")
        params_model = None
        if params_data:
            if isinstance(params_data, str):
                params_model = VideoTaskParams(**json.loads(params_data))
            elif isinstance(params_data, dict):
                params_model = VideoTaskParams(**params_data)

        # Get progress from DB or default based on status
        progress = row.get("progress")
        if progress is None:
            if status == VideoTaskStatus.completed:
                progress = 100
            elif status == VideoTaskStatus.queued:
                progress = 0
            else:
                progress = 0

        # Handle datetime parsing from string (Supabase returns ISO strings)
        # Note: Python 3.10 and earlier require exactly 0, 3, or 6 decimal places
        # Supabase may return 5 decimal places, so we normalize to 6
        def parse_datetime(dt_str: str) -> datetime:
            """Parse ISO datetime string with variable-length microseconds."""
            if not dt_str:
                return None
            dt_str = dt_str.replace("Z", "+00:00")
            # Normalize microseconds to 6 digits for Python 3.10 compatibility
            import re
            match = re.match(r"(.+\.\d{1,6})(\d*)([+-]\d{2}:\d{2})$", dt_str)
            if match:
                base, extra, tz = match.groups()
                # Pad or truncate to 6 decimal places
                decimal_part = base.split(".")[-1]
                if len(decimal_part) < 6:
                    base = base[:-len(decimal_part)] + decimal_part.ljust(6, "0")
                dt_str = base + tz
            return datetime.fromisoformat(dt_str)

        created_at = row.get("created_at")
        updated_at = row.get("updated_at")
        if isinstance(created_at, str):
            created_at = parse_datetime(created_at)
        if isinstance(updated_at, str):
            updated_at = parse_datetime(updated_at)

        return VideoTask(
            id=row["id"],
            title=row.get("title"),
            prompt=row.get("prompt"),
            status=status,
            createdAt=created_at,
            updatedAt=updated_at,
            videoUrl=row.get("video_url"),
            errorMessage=row.get("error_message"),
            progress=progress,
            sourceImageUrl=row.get("source_image_url"),
            engine=row.get("engine"),
            params=params_model,
        )


async def simulate_task_processing(task_id: str, service: VideoTaskService):
    """
    Background function to simulate task status transitions (for engine=mock only).
    queued -> processing (after 5s) -> completed (after 15s)
    All transitions are persisted to database via service_client (bypasses RLS).
    """
    try:
        # Wait 5s then transition to processing
        await asyncio.sleep(5)
        service.update_task_status(task_id, VideoTaskStatus.processing, progress=10)
        logger.info(f"[BG] Task {task_id} transitioned to processing")

        # Wait 15s then transition to completed
        await asyncio.sleep(15)
        video_url = random.choice(DEMO_VIDEOS)
        service.update_task_status(
            task_id,
            VideoTaskStatus.completed,
            progress=100,
            video_url=video_url,
        )
        logger.info(f"[BG] Task {task_id} transitioned to completed with videoUrl")
    except Exception as e:
        logger.error(f"[BG] Error processing task {task_id}: {e}")
        try:
            service.update_task_status(
                task_id,
                VideoTaskStatus.failed,
                error_message=f"Processing error: {str(e)}",
            )
        except Exception as update_err:
            logger.error(f"[BG] Failed to update task {task_id} to failed: {update_err}")


# Runway polling configuration
RUNWAY_POLL_INTERVAL = 5  # seconds between status checks
RUNWAY_MAX_POLL_TIME = 300  # max 5 minutes polling


async def process_runway_task(
    task_id: str,
    prompt: str,
    source_image_url: str,
    service: VideoTaskService,
    request_id: str = "unknown",
):
    """
    Background function to process Runway image-to-video task.
    Uses service_client (bypasses RLS) for status updates.

    Flow:
    1. queued -> processing (immediately)
    2. Call Runway API to create task
    3. Poll Runway for completion (progress updates: 0 -> 50 -> 100)
    4. Download video from Runway
    5. Upload to Supabase Storage
    6. processing -> completed with Supabase URL

    On any error: processing -> failed with errorMessage
    """
    logger.info(f"[{request_id}] Starting Runway processing for task {task_id}")

    try:
        # Step 1: Transition to processing
        service.update_task_status(task_id, VideoTaskStatus.processing, progress=0)
        logger.info(f"[{request_id}] Task {task_id} transitioned to processing")

        # Step 2: Create Runway task
        logger.info(f"[{request_id}] Creating Runway task for {task_id}")
        runway_task_id = await create_image_to_video_task(
            prompt_image_url=source_image_url,
            prompt_text=prompt,
            request_id=request_id,
        )
        logger.info(f"[{request_id}] Runway task created: {runway_task_id}")

        # Update progress to 10% after task creation
        service.update_task_status(task_id, VideoTaskStatus.processing, progress=10)

        # Step 3: Poll Runway for completion
        elapsed_time = 0
        output_url = None

        while elapsed_time < RUNWAY_MAX_POLL_TIME:
            await asyncio.sleep(RUNWAY_POLL_INTERVAL)
            elapsed_time += RUNWAY_POLL_INTERVAL

            runway_result = await get_task_status(runway_task_id, request_id)
            logger.info(
                f"[{request_id}] Runway task {runway_task_id} status={runway_result.status.value} "
                f"progress={runway_result.progress}"
            )

            # Update progress (map Runway progress 0-100 to our progress 10-90)
            progress = 10 + int(runway_result.progress * 0.8)  # 10 + 80% of runway progress
            service.update_task_status(task_id, VideoTaskStatus.processing, progress=progress)

            if runway_result.status == RunwayTaskStatus.SUCCEEDED:
                output_url = runway_result.output_url
                logger.info(f"[{request_id}] Runway task completed: {output_url}")
                break
            elif runway_result.status == RunwayTaskStatus.FAILED:
                raise RunwayAPIError(
                    f"Runway generation failed: {runway_result.error_message}"
                )
            elif runway_result.status == RunwayTaskStatus.CANCELED:
                raise RunwayAPIError("Runway task was canceled")

        if not output_url:
            raise RunwayAPIError(f"Runway task timed out after {RUNWAY_MAX_POLL_TIME}s")

        # Step 4: Download video from Runway
        logger.info(f"[{request_id}] Downloading video from Runway: {output_url[:50]}...")
        service.update_task_status(task_id, VideoTaskStatus.processing, progress=92)

        async with httpx.AsyncClient(timeout=120.0) as http_client:
            download_response = await http_client.get(output_url)
            if download_response.status_code != 200:
                raise RunwayAPIError(
                    f"Failed to download video: HTTP {download_response.status_code}"
                )
            video_bytes = download_response.content

        logger.info(f"[{request_id}] Downloaded video: {len(video_bytes)} bytes")
        service.update_task_status(task_id, VideoTaskStatus.processing, progress=95)

        # Step 5: Upload to Supabase Storage
        logger.info(f"[{request_id}] Uploading video to Supabase...")
        upload_result = await upload_video(
            video_bytes=video_bytes,
            content_type="video/mp4",
            request_id=request_id,
        )
        supabase_url = upload_result.url
        logger.info(f"[{request_id}] Video uploaded to Supabase: {upload_result.path}")

        # Step 6: Transition to completed
        service.update_task_status(
            task_id,
            VideoTaskStatus.completed,
            progress=100,
            video_url=supabase_url,
        )
        logger.info(f"[{request_id}] Task {task_id} completed with videoUrl: {supabase_url[:50]}...")

    except (RunwayAPIError, RunwayConfigError) as e:
        error_msg = f"Runway error: {str(e)}"
        logger.error(f"[{request_id}] {error_msg}")
        try:
            service.update_task_status(
                task_id,
                VideoTaskStatus.failed,
                error_message=error_msg,
            )
        except Exception as update_err:
            logger.error(f"[{request_id}] Failed to update task {task_id} to failed: {update_err}")

    except (SupabaseUploadError, SupabaseConfigError) as e:
        error_msg = f"Storage error: {str(e)}"
        logger.error(f"[{request_id}] {error_msg}")
        try:
            service.update_task_status(
                task_id,
                VideoTaskStatus.failed,
                error_message=error_msg,
            )
        except Exception as update_err:
            logger.error(f"[{request_id}] Failed to update task {task_id} to failed: {update_err}")

    except Exception as e:
        error_msg = f"Processing error: {str(e)}"
        logger.error(f"[{request_id}] Unexpected error in Runway processing: {e}")
        try:
            service.update_task_status(
                task_id,
                VideoTaskStatus.failed,
                error_message=error_msg,
            )
        except Exception as update_err:
            logger.error(f"[{request_id}] Failed to update task {task_id} to failed: {update_err}")


# Singleton instance
video_task_service = VideoTaskService()
