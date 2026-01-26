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
from datetime import datetime, timedelta, timezone
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


def safe_parse_datetime(dt_str: str) -> datetime:
    """
    Safely parse ISO format datetime strings with various timezone formats.

    Handles:
    - '2024-01-01T12:00:00Z' (Z suffix)
    - '2024-01-01T12:00:00+00:00' (timezone offset)
    - '2024-01-01T12:00:00.123456+00:00' (microseconds)
    - '2024-01-01T12:00:00.1234567+00:00' (extra precision - Supabase)
    """
    if not dt_str:
        return datetime.now(timezone.utc)

    try:
        # Replace 'Z' with '+00:00' for Python compatibility
        dt_str = dt_str.replace("Z", "+00:00")

        # Handle Supabase timestamps with >6 decimal places
        import re
        match = re.match(r"(.+\.\d{1,6})(\d*)([+-]\d{2}:\d{2})$", dt_str)
        if match:
            base, extra, tz = match.groups()
            # Truncate to 6 decimal places (microseconds)
            decimal_part = base.split(".")[-1]
            if len(decimal_part) < 6:
                base = base[:-len(decimal_part)] + decimal_part.ljust(6, "0")
            dt_str = base + tz

        return datetime.fromisoformat(dt_str)
    except (ValueError, AttributeError) as e:
        logger.warning(f"Failed to parse datetime '{dt_str}': {e}, using current time")
        return datetime.now(timezone.utc)


# State machine: allowed transitions (BE-STG13-008: added cancelled)
ALLOWED_TRANSITIONS = {
    VideoTaskStatus.queued: [VideoTaskStatus.processing, VideoTaskStatus.failed, VideoTaskStatus.cancelled],
    VideoTaskStatus.processing: [VideoTaskStatus.completed, VideoTaskStatus.failed, VideoTaskStatus.cancelled],
    VideoTaskStatus.completed: [],  # Terminal state
    VideoTaskStatus.failed: [],     # Terminal state
    VideoTaskStatus.cancelled: [],  # Terminal state (BE-STG13-008)
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
            created_at = safe_parse_datetime(parts[0])
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
        user_id: str,
        limit: int = 20,
        cursor_time: Optional[datetime] = None,
        cursor_id: Optional[str] = None,
        status: Optional[str] = None,
        q: Optional[str] = None,
        sort: str = "createdAt_desc",
    ) -> Tuple[List[VideoTask], Optional[str]]:
        """
        Get paginated list of video tasks from database (RLS + explicit user_id filter).

        Args:
            client: Supabase client (user_client for RLS)
            user_id: User ID from JWT (explicit filter, defense-in-depth)
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
            "source_image_url, engine, params, progress, user_id, "
            "processing_at, completed_at, failed_at, cancelled_at, video_url_expires_at"
        )

        # BE-AUTH-001: Explicit user_id filter (defense-in-depth, not relying solely on RLS)
        query = query.eq("user_id", user_id)

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

    def get_task_by_id(
        self, client: Client, task_id: str, user_id: Optional[str] = None
    ) -> Optional[VideoTask]:
        """
        Get a single video task by ID from database (RLS + explicit user_id filter).

        Args:
            client: Supabase client (user_client for RLS, or service_client for background jobs)
            task_id: Task ID to fetch
            user_id: User ID for explicit filtering (required for user-facing endpoints)
                     Pass None only for background jobs using service_client

        Returns:
            VideoTask or None if not found (or not owned by user)
        """
        query = client.table("video_tasks").select(
            "id, title, prompt, status, created_at, updated_at, video_url, error_message, "
            "source_image_url, engine, params, progress, user_id, "
            "processing_at, completed_at, failed_at, video_url_expires_at"
        ).eq("id", task_id)

        # BE-AUTH-001: Explicit user_id filter (defense-in-depth)
        if user_id is not None:
            query = query.eq("user_id", user_id)

        response = query.execute()

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

        elif status == VideoTaskStatus.cancelled:
            if video_url is not None:
                return "videoUrl must be null for cancelled status"
            if error_message is not None:
                return "errorMessage must be null for cancelled status"

        return None

    def update_task_status(
        self,
        task_id: str,
        status: VideoTaskStatus,
        progress: Optional[int] = None,
        video_url: Optional[str] = None,
        video_url_expires_at: Optional[datetime] = None,
        error_message: Optional[str] = None,
        request_id: str = "unknown",
    ) -> Optional[VideoTask]:
        """
        Update task status and related fields in database.
        BE-STG12-009: Set transition timestamps and log latency.
        BE-STG13-003: Track video URL expiration for signed URLs.

        Uses service_client (bypasses RLS) for background job updates.
        """
        now = datetime.now(timezone.utc)
        service_client = get_service_client()

        # Fetch current task for latency calculation
        current_task = self.get_task_by_id(service_client, task_id)
        old_status = current_task.status if current_task else VideoTaskStatus.queued

        # Build update data
        update_data = {
            "status": status.value,
            "updated_at": now.isoformat(),
        }

        if progress is not None:
            update_data["progress"] = progress
        if video_url is not None:
            update_data["video_url"] = video_url
        # BE-STG13-003: Store signed URL expiration
        if video_url_expires_at is not None:
            update_data["video_url_expires_at"] = video_url_expires_at.isoformat()
        if error_message is not None:
            update_data["error_message"] = error_message

        # BE-STG12-009: Set transition timestamps (once only)
        if status == VideoTaskStatus.processing:
            update_data["processing_at"] = now.isoformat()
        elif status == VideoTaskStatus.completed:
            update_data["completed_at"] = now.isoformat()
        elif status == VideoTaskStatus.failed:
            update_data["failed_at"] = now.isoformat()
        elif status == VideoTaskStatus.cancelled:
            update_data["cancelled_at"] = now.isoformat()

        response = service_client.table("video_tasks").update(update_data).eq("id", task_id).execute()

        # BE-STG12-009: Calculate and log latency
        latency_ms = 0
        if current_task:
            if status == VideoTaskStatus.processing and current_task.createdAt:
                # Queue time: createdAt → processing
                latency_ms = int((now - current_task.createdAt).total_seconds() * 1000)
            elif status in [VideoTaskStatus.completed, VideoTaskStatus.failed] and current_task.processingAt:
                # Processing time: processingAt → completed/failed
                latency_ms = int((now - current_task.processingAt).total_seconds() * 1000)

        logger.info(
            f"[{request_id}] STATUS_CHANGE task={task_id} "
            f"{old_status.value}→{status.value} latency={latency_ms}ms"
        )

        # Fetch updated task
        return self.get_task_by_id(service_client, task_id)

    def count_active_tasks(self, user_id: str) -> int:
        """BE-STG13-008: Count active (queued or processing) tasks for a user."""
        service_client = get_service_client()
        response = (
            service_client.table("video_tasks")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .in_("status", [VideoTaskStatus.queued.value, VideoTaskStatus.processing.value])
            .execute()
        )
        return response.count or 0

    def is_task_cancelled(self, task_id: str) -> bool:
        """BE-STG13-008: Check if a task has been cancelled."""
        service_client = get_service_client()
        response = (
            service_client.table("video_tasks")
            .select("status")
            .eq("id", task_id)
            .limit(1)
            .execute()
        )
        if response.data:
            return response.data[0].get("status") == VideoTaskStatus.cancelled.value
        return False

    def delete_task(self, client: Client, task_id: str, user_id: str) -> bool:
        """
        Delete a video task by ID (hard delete, RLS + explicit user_id filter).

        Args:
            client: Supabase client (user_client for RLS)
            task_id: Task ID to delete
            user_id: User ID for explicit filtering (defense-in-depth)

        Returns:
            True if task was deleted, False if not found (or not owned by user)
        """
        # Check if task exists first (explicit user_id filter)
        existing = self.get_task_by_id(client, task_id, user_id=user_id)
        if not existing:
            return False

        # BE-AUTH-001: Explicit user_id filter on delete (defense-in-depth)
        response = client.table("video_tasks").delete().eq("id", task_id).eq("user_id", user_id).execute()

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
        created_at = row.get("created_at")
        updated_at = row.get("updated_at")
        processing_at = row.get("processing_at")
        completed_at = row.get("completed_at")
        failed_at = row.get("failed_at")
        cancelled_at = row.get("cancelled_at")  # BE-STG13-008

        if isinstance(created_at, str):
            created_at = safe_parse_datetime(created_at)
        if isinstance(updated_at, str):
            updated_at = safe_parse_datetime(updated_at)
        if isinstance(processing_at, str):
            processing_at = safe_parse_datetime(processing_at)
        if isinstance(completed_at, str):
            completed_at = safe_parse_datetime(completed_at)
        if isinstance(failed_at, str):
            failed_at = safe_parse_datetime(failed_at)
        if isinstance(cancelled_at, str):
            cancelled_at = safe_parse_datetime(cancelled_at)

        # BE-STG13-003: Licensing compliance - only final film output delivered
        video_url = row.get("video_url")
        delivery_type = "final_film_only" if video_url else None
        video_url_expires_at = row.get("video_url_expires_at")
        if isinstance(video_url_expires_at, str):
            video_url_expires_at = safe_parse_datetime(video_url_expires_at)

        return VideoTask(
            id=row["id"],
            title=row.get("title"),
            prompt=row.get("prompt"),
            status=status,
            createdAt=created_at,
            updatedAt=updated_at,
            videoUrl=video_url,
            errorMessage=row.get("error_message"),
            progress=progress,
            sourceImageUrl=row.get("source_image_url"),
            engine=row.get("engine"),
            params=params_model,
            # BE-STG12-009: Status transition timestamps
            processingAt=processing_at,
            completedAt=completed_at,
            failedAt=failed_at,
            cancelledAt=cancelled_at,  # BE-STG13-008
            # BE-STG13-003: Licensing compliance
            deliveryType=delivery_type,
            videoUrlExpiresAt=video_url_expires_at,
        )


async def simulate_task_processing(task_id: str, service: VideoTaskService, request_id: str = "bg_mock"):
    """
    Background function to simulate task status transitions (for engine=mock only).
    queued -> processing (after 5s) -> completed (after 15s)
    BE-STG13-008: Checks for cancellation during processing.
    """
    try:
        # Wait 5s then transition to processing
        await asyncio.sleep(5)
        if service.is_task_cancelled(task_id):
            logger.info(f"[{request_id}] Task {task_id} cancelled, stopping")
            return
        service.update_task_status(task_id, VideoTaskStatus.processing, progress=10, request_id=request_id)

        # Wait 15s (check cancellation every 5s)
        for _ in range(3):
            await asyncio.sleep(5)
            if service.is_task_cancelled(task_id):
                logger.info(f"[{request_id}] Task {task_id} cancelled during processing")
                return

        video_url = random.choice(DEMO_VIDEOS)
        service.update_task_status(
            task_id,
            VideoTaskStatus.completed,
            progress=100,
            video_url=video_url,
            request_id=request_id,
        )
    except Exception as e:
        logger.error(f"[{request_id}] Error processing task {task_id}: {e}")
        try:
            # Sanitize error message - don't expose internal details
            error_msg = "Video processing failed. Please try again."
            if "timeout" in str(e).lower():
                error_msg = "Processing timed out. Please try again."
            elif "network" in str(e).lower() or "connection" in str(e).lower():
                error_msg = "Network error during processing. Please try again."
            service.update_task_status(
                task_id,
                VideoTaskStatus.failed,
                error_message=error_msg,
                request_id=request_id,
            )
        except Exception as update_err:
            logger.error(f"[{request_id}] Failed to update task {task_id} to failed: {update_err}")


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
        service.update_task_status(task_id, VideoTaskStatus.processing, progress=0, request_id=request_id)

        # Step 2: Create Runway task
        logger.info(f"[{request_id}] Creating Runway task for {task_id}")
        runway_task_id = await create_image_to_video_task(
            prompt_image_url=source_image_url,
            prompt_text=prompt,
            request_id=request_id,
        )
        logger.info(f"[{request_id}] Runway task created: {runway_task_id}")

        # Update progress to 10% after task creation
        service.update_task_status(task_id, VideoTaskStatus.processing, progress=10, request_id=request_id)

        # Step 3: Poll Runway for completion
        elapsed_time = 0
        output_url = None

        while elapsed_time < RUNWAY_MAX_POLL_TIME:
            await asyncio.sleep(RUNWAY_POLL_INTERVAL)
            elapsed_time += RUNWAY_POLL_INTERVAL

            # BE-STG13-008: Check cancellation before continuing
            if service.is_task_cancelled(task_id):
                logger.info(f"[{request_id}] Task {task_id} cancelled during Runway polling, stopping")
                return

            runway_result = await get_task_status(runway_task_id, request_id)
            logger.info(
                f"[{request_id}] Runway task {runway_task_id} status={runway_result.status.value} "
                f"progress={runway_result.progress}"
            )

            # Update progress (map Runway progress 0-100 to our progress 10-90)
            progress = 10 + int(runway_result.progress * 0.8)  # 10 + 80% of runway progress
            service.update_task_status(task_id, VideoTaskStatus.processing, progress=progress, request_id=request_id)

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
        service.update_task_status(task_id, VideoTaskStatus.processing, progress=92, request_id=request_id)

        async with httpx.AsyncClient(timeout=120.0) as http_client:
            download_response = await http_client.get(output_url)
            if download_response.status_code != 200:
                raise RunwayAPIError(
                    f"Failed to download video: HTTP {download_response.status_code}"
                )
            video_bytes = download_response.content

        logger.info(f"[{request_id}] Downloaded video: {len(video_bytes)} bytes")
        service.update_task_status(task_id, VideoTaskStatus.processing, progress=95, request_id=request_id)

        # Step 5: Upload to Supabase Storage (BE-STG13-003: signed URL for compliance)
        logger.info(f"[{request_id}] Uploading video to Supabase with signed URL...")
        upload_result = await upload_video(
            video_bytes=video_bytes,
            content_type="video/mp4",
            request_id=request_id,
            use_signed_url=True,  # BE-STG13-003: Always use signed URLs
        )
        supabase_url = upload_result.url

        # BE-STG13-003: Calculate URL expiration datetime
        video_url_expires_at = None
        if upload_result.expires_in:
            video_url_expires_at = datetime.now(timezone.utc) + timedelta(seconds=upload_result.expires_in)
            logger.info(
                f"[{request_id}] Video uploaded with signed URL: path={upload_result.path}, "
                f"expires_in={upload_result.expires_in}s, expires_at={video_url_expires_at.isoformat()}"
            )
        else:
            logger.info(f"[{request_id}] Video uploaded to Supabase: {upload_result.path}")

        # Step 6: Transition to completed
        service.update_task_status(
            task_id,
            VideoTaskStatus.completed,
            progress=100,
            video_url=supabase_url,
            video_url_expires_at=video_url_expires_at,
            request_id=request_id,
        )
        logger.info(f"[{request_id}] Task {task_id} completed with videoUrl: {supabase_url[:50]}...")

    except (RunwayAPIError, RunwayConfigError) as e:
        logger.error(f"[{request_id}] Runway error for task {task_id}: {e}")
        # Sanitize: don't expose internal API details
        error_msg = "Video generation service error. Please try again later."
        try:
            service.update_task_status(
                task_id,
                VideoTaskStatus.failed,
                error_message=error_msg,
                request_id=request_id,
            )
        except Exception as update_err:
            logger.error(f"[{request_id}] Failed to update task {task_id} to failed: {update_err}")

    except (SupabaseUploadError, SupabaseConfigError) as e:
        logger.error(f"[{request_id}] Storage error for task {task_id}: {e}")
        # Sanitize: don't expose storage details
        error_msg = "Failed to save video. Please try again later."
        try:
            service.update_task_status(
                task_id,
                VideoTaskStatus.failed,
                error_message=error_msg,
                request_id=request_id,
            )
        except Exception as update_err:
            logger.error(f"[{request_id}] Failed to update task {task_id} to failed: {update_err}")

    except Exception as e:
        logger.error(f"[{request_id}] Unexpected error in Runway processing: {e}")
        # Sanitize: generic error message for unexpected errors
        error_msg = "Video processing failed. Please try again."
        try:
            service.update_task_status(
                task_id,
                VideoTaskStatus.failed,
                error_message=error_msg,
                request_id=request_id,
            )
        except Exception as update_err:
            logger.error(f"[{request_id}] Failed to update task {task_id} to failed: {update_err}")


# Singleton instance
video_task_service = VideoTaskService()
