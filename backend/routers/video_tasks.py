"""
Video Tasks API Router - Auth-protected endpoints with RLS enforcement (BE-AUTH-001).
"""
import asyncio
import logging
import time
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Header, Query, Request, Response
from fastapi.responses import JSONResponse

from models.video_task import (
    CreateVideoTaskRequest,
    DebugInfo,
    UpdateStatusRequest,
    VideoTask,
    VideoTaskListResponse,
    VideoEngine,
    VideoTaskStatus,
)
from services.auth import AuthUser, get_current_user
from services.supabase_client import get_user_client, get_service_client
from services.idempotency import check_idempotency, store_idempotency
from services.video_task_service import (
    decode_cursor,
    simulate_task_processing,
    process_runway_task,
    video_task_service,
)
from services.ratelimit import limiter, RATE_LIMIT_VIDEO_CREATE, MAX_CONCURRENT_TASKS_PER_USER
from services.capabilities import capability_service
from services.error_response import error_response

# Setup logging
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/video-tasks", tags=["Video Tasks"])


def _check_task_ownership(task_id: str, user_id: str, request_id: str):
    """
    BE-STG12-007: Check task existence and ownership.
    Returns (task, error_response) tuple.
    - If task not found: (None, 404 response)
    - If task not owned by user: (None, 403 response)
    - If owned: (task, None)
    """
    service_client = get_service_client()

    # Query task with user_id field (raw query to get owner info)
    result = (
        service_client.table("video_tasks")
        .select("id, user_id")
        .eq("id", task_id)
        .limit(1)
        .execute()
    )

    if not result.data:
        logger.info(f"[{request_id}] Task not found: {task_id}")
        return None, error_response(
            status_code=404,
            code="NOT_FOUND",
            message="Video task not found",
            request_id=request_id,
            details={"taskId": task_id},
        )

    task_row = result.data[0]
    task_owner_id = task_row.get("user_id")

    # Check ownership
    if task_owner_id != user_id:
        owner_masked = task_owner_id[:8] + "..." if task_owner_id else "unknown"
        logger.warning(
            f"[{request_id}] FORBIDDEN: user={user_id[:8]}... attempted to access task={task_id} owned by {owner_masked}"
        )
        return None, error_response(
            status_code=403,
            code="FORBIDDEN",
            message="You do not have permission to access this task",
            request_id=request_id,
            details={"taskId": task_id},
        )

    # Ownership verified - now get full task via user_client
    user_client = get_user_client_from_service(user_id)
    task = video_task_service.get_task_by_id(service_client, task_id, user_id=user_id)

    return task, None


def get_user_client_from_service(user_id: str):
    """Helper to get service client (ownership already verified)."""
    return get_service_client()


@router.get(
    "",
    response_model=VideoTaskListResponse,
    responses={
        200: {"description": "List of video tasks with pagination"},
        400: {
            "description": "Invalid cursor or filter mismatch",
            "content": {
                "application/json": {
                    "examples": {
                        "invalid_cursor": {
                            "summary": "Invalid cursor format",
                            "value": {
                                "code": "INVALID_CURSOR",
                                "message": "Invalid cursor format: unable to decode",
                                "requestId": "req_xxx",
                                "details": {"cursor": "invalid_base64_string"},
                            },
                        },
                        "cursor_filter_mismatch": {
                            "summary": "Cursor created with different filters",
                            "value": {
                                "code": "CURSOR_FILTER_MISMATCH",
                                "message": "Cursor was created with different filters. Start a new search.",
                                "requestId": "req_xxx",
                                "details": {"hint": "Remove cursor when changing q, status, or sort"},
                            },
                        },
                    }
                }
            },
        },
        422: {
            "description": "Validation error (e.g., limit out of range)",
            "content": {
                "application/json": {
                    "example": {
                        "code": "VALIDATION_ERROR",
                        "message": "Limit must be between 1 and 100",
                        "requestId": "req_xxx",
                        "details": {"limit": 999},
                    }
                }
            },
        },
    },
)
async def get_video_tasks(
    request: Request,
    user: AuthUser = Depends(get_current_user),
    limit: int = Query(
        default=20,
        ge=1,
        le=100,
        description="Number of tasks to return (1-100, default 20)",
    ),
    cursor: Optional[str] = Query(
        default=None,
        description="Opaque cursor from previous response's nextCursor. "
        "Encodes (createdAt, id) for stable pagination. Invalid cursor returns 400.",
    ),
    status: Optional[str] = Query(
        default=None,
        pattern="^(pending|queued|processing|completed|failed|cancelled)$",
        description="Filter by status",
    ),
    q: Optional[str] = Query(
        default=None,
        max_length=100,
        description="Search query: matches title (case-insensitive) OR id (exact). Empty/whitespace = no filter.",
    ),
    sort: str = Query(
        default="createdAt_desc",
        pattern="^createdAt_(desc|asc)$",
        description="Sort order: createdAt_desc or createdAt_asc. Uses compound key (createdAt, id) for stability.",
    ),
) -> VideoTaskListResponse:
    """
    Get paginated list of video tasks with filtering and sorting.

    **Cursor Pagination:**
    - `nextCursor` encodes (createdAt, id, q, status, sort) for stable pagination
    - For `createdAt_desc`: next page returns items where (createdAt, id) < cursor
    - `nextCursor = null` means no more pages
    - **Important:** Cursor is tied to filters. Changing `q`, `status`, or `sort` with old cursor returns 400.

    **Search (`q` parameter):**
    - Matches title (case-insensitive contains) OR id (exact match)
    - Empty/whitespace treated as no filter

    **Parameters:**
    - **limit**: Number of tasks (1-100, default 20)
    - **cursor**: Opaque cursor from previous response's nextCursor
    - **status**: Filter by status (pending|processing|completed|failed)
    - **q**: Search query (title OR id)
    - **sort**: Sort order (createdAt_desc|createdAt_asc, default desc)
    """
    start_time = time.perf_counter()
    request_id = getattr(request.state, "request_id", "unknown")

    # Normalize q: trim whitespace
    normalized_q = q.strip() if q else None
    if normalized_q == "":
        normalized_q = None

    # Sanitize q for logging (truncate)
    q_log = f'"{normalized_q[:20]}..."' if normalized_q and len(normalized_q) > 20 else (f'"{normalized_q}"' if normalized_q else "null")

    # Log request with all params
    logger.info(
        f"[{request_id}] GET /api/video-tasks "
        f"limit={limit} cursor={'...' + cursor[-10:] if cursor and len(cursor) > 10 else cursor} "
        f"status={status} q={q_log} sort={sort}"
    )

    # Validate and decode cursor if provided
    cursor_time = None
    cursor_id = None
    if cursor:
        decoded_cursor = decode_cursor(cursor)
        if decoded_cursor is None:
            logger.warning(f"[{request_id}] Invalid cursor format: {cursor[:20]}...")
            return error_response(
                status_code=400,
                code="INVALID_CURSOR",
                message="Invalid cursor format: unable to decode",
                request_id=request_id,
                details={"cursor": cursor[:50] if len(cursor) > 50 else cursor},
            )

        cursor_time, cursor_id, cursor_q, cursor_status, cursor_sort = decoded_cursor
        logger.info(
            f"[{request_id}] Cursor decoded: createdAt={cursor_time.isoformat()}, id={cursor_id}, "
            f"q={cursor_q}, status={cursor_status}, sort={cursor_sort}"
        )

        # Validate filter consistency
        current_q = normalized_q or ""
        current_status = status or ""
        cursor_q_val = cursor_q or ""
        cursor_status_val = cursor_status or ""

        if cursor_q_val != current_q or cursor_status_val != current_status or cursor_sort != sort:
            logger.warning(
                f"[{request_id}] Cursor filter mismatch: "
                f"cursor(q={cursor_q_val}, status={cursor_status_val}, sort={cursor_sort}) != "
                f"request(q={current_q}, status={current_status}, sort={sort})"
            )
            return error_response(
                status_code=400,
                code="CURSOR_FILTER_MISMATCH",
                message="Cursor was created with different filters. Start a new search.",
                request_id=request_id,
                details={"hint": "Remove cursor parameter when changing q, status, or sort"},
            )

    # BE-AUTH-001: Use user_client for RLS enforcement + explicit user_id filter
    user_client = get_user_client(user.jwt_token)

    tasks, next_cursor = video_task_service.get_tasks(
        client=user_client,
        user_id=user.id,
        limit=limit,
        cursor_time=cursor_time,
        cursor_id=cursor_id,
        status=status,
        q=normalized_q,
        sort=sort,
    )

    # Calculate latency
    latency_ms = int((time.perf_counter() - start_time) * 1000)

    # Log query boundary info
    if tasks:
        first_task = tasks[0]
        last_task = tasks[-1]
        logger.info(
            f"[{request_id}] Query boundary: first=(createdAt={first_task.createdAt.isoformat()}, id={first_task.id}), "
            f"last=(createdAt={last_task.createdAt.isoformat()}, id={last_task.id})"
        )

    logger.info(
        f"[{request_id}] Fetched {len(tasks)} tasks, nextCursor={next_cursor is not None}, latency={latency_ms}ms"
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
        422: {
            "description": "Validation error (missing required fields, invalid engine)",
            "content": {
                "application/json": {
                    "example": {
                        "code": "VALIDATION_ERROR",
                        "message": "body.title: Field required",
                        "requestId": "req_xxx",
                    }
                }
            },
        },
    },
)
@limiter.limit(RATE_LIMIT_VIDEO_CREATE)
async def create_video_task(
    request_body: CreateVideoTaskRequest,
    request: Request,
    user: AuthUser = Depends(get_current_user),
    idempotency_key: Optional[str] = Header(
        default=None,
        alias="Idempotency-Key",
        description="Optional key to prevent duplicate task creation (valid for 60 minutes). "
        "If the same key is used with a different payload, returns 409 Conflict.",
    ),
) -> VideoTask:
    """
    Create a new video task (BE-STG8 + BE-ENGINE-001).

    - **title**: Task title (required, max 500 chars)
    - **prompt**: Video generation prompt (required, max 2000 chars)
    - **sourceImageUrl**: Source image URL (required for engine=runway)
    - **engine**: Video engine - "runway" or "mock" (default: mock)
    - **params**: Optional generation parameters (durationSec, ratio)
    - **Idempotency-Key** header: Optional, prevents duplicate creation for 60 minutes.

    Returns the created task with queued status.
    For engine=mock: auto-transitions queued -> processing (5s) -> completed (20s)
    For engine=runway: async processing via Runway API -> uploads to Supabase Storage
    """
    request_id = getattr(request.state, "request_id", "unknown")

    # Log payload summary (truncate long prompts)
    title_log = (request_body.title[:50] + "...") if len(request_body.title) > 50 else request_body.title
    prompt_log = (request_body.prompt[:30] + "...") if len(request_body.prompt) > 30 else request_body.prompt
    logger.info(
        f"[{request_id}] POST /api/video-tasks: "
        f"title=\"{title_log}\" prompt=\"{prompt_log}\" engine={request_body.engine.value}"
    )

    # BE-STG13-008: Check concurrency limit before creating task
    active_count = video_task_service.count_active_tasks(user.id)
    if active_count >= MAX_CONCURRENT_TASKS_PER_USER:
        logger.warning(
            f"[{request_id}] CONCURRENCY_LIMIT: user={user.id[:8]}... has {active_count} active tasks"
        )
        return error_response(
            status_code=429,
            code="CONCURRENCY_LIMIT_EXCEEDED",
            message=f"Maximum {MAX_CONCURRENT_TASKS_PER_USER} concurrent tasks allowed. Wait for existing tasks to complete.",
            request_id=request_id,
            details={"activeCount": active_count, "limit": MAX_CONCURRENT_TASKS_PER_USER},
        )

    # BE-STG13-009: Check if runway engine is available
    if request_body.engine == VideoEngine.runway and not capability_service.engine_runway_enabled:
        logger.warning(f"[{request_id}] SERVICE_UNAVAILABLE: Runway engine disabled")
        return error_response(
            status_code=503,
            code="SERVICE_UNAVAILABLE",
            message="Runway engine is temporarily unavailable. Please try again later or use mock engine.",
            request_id=request_id,
            details={"feature": "engineRunway", "suggestion": "Use engine=mock for testing"},
        )

    # Validate sourceImageUrl is required for runway engine
    if request_body.engine == VideoEngine.runway and not request_body.sourceImageUrl:
        logger.warning(f"[{request_id}] Missing sourceImageUrl for runway engine")
        return error_response(
            status_code=422,
            code="VALIDATION_ERROR",
            message="sourceImageUrl is required when engine=runway",
            request_id=request_id,
            details={"field": "sourceImageUrl", "engine": "runway"},
        )

    # BE-AUTH-001: Use user_client for RLS enforcement
    user_client = get_user_client(user.jwt_token)

    # Check idempotency if key provided (BE-STG12-004: persistent via Supabase)
    if idempotency_key:
        payload = {
            "title": request_body.title,
            "prompt": request_body.prompt,
            "engine": request_body.engine.value,
        }
        idemp_result = check_idempotency(user.id, idempotency_key, payload)

        # Payload mismatch → 409 Conflict
        if idemp_result.mismatch:
            logger.warning(
                f"[{request_id}] Idempotency CONFLICT: key {idempotency_key[:8]}... "
                "used with different payload - returning 409"
            )
            return error_response(
                status_code=409,
                code="IDEMPOTENCY_KEY_CONFLICT",
                message="Idempotency-Key already used with different payload",
                request_id=request_id,
                details={"idempotencyKey": idempotency_key[:16] + "..."},
            )

        # Cache hit with matching payload → return existing task
        if idemp_result.hit and idemp_result.task_id:
            logger.info(f"[{request_id}] Idempotency hit: returning existing task {idemp_result.task_id}")
            task = video_task_service.get_task_by_id(user_client, idemp_result.task_id, user_id=user.id)
            if task:
                task.debug = DebugInfo(requestId=request_id)
                return task

    # Prepare params dict
    params_dict = None
    if request_body.params:
        params_dict = request_body.params.model_dump()

    # Create new task (BE-AUTH-001: pass user_id for RLS)
    task = video_task_service.create_task(
        client=user_client,
        user_id=user.id,
        title=request_body.title,
        prompt=request_body.prompt,
        source_image_url=request_body.sourceImageUrl,
        engine=request_body.engine.value,
        params=params_dict,
    )
    logger.info(f"[{request_id}] Created task {task.id} with status={task.status.value} for user={user.id[:8]}...")

    # Store idempotency key if provided (BE-STG12-004: persistent via Supabase)
    if idempotency_key:
        payload = {
            "title": request_body.title,
            "prompt": request_body.prompt,
            "engine": request_body.engine.value,
        }
        store_idempotency(user.id, idempotency_key, payload, task.id)

    # Schedule background processing based on engine
    if request_body.engine == VideoEngine.mock:
        asyncio.create_task(simulate_task_processing(task.id, video_task_service, request_id))
        logger.info(f"[{request_id}] Scheduled background processing for task {task.id} (engine=mock)")
    elif request_body.engine == VideoEngine.runway:
        asyncio.create_task(
            process_runway_task(
                task_id=task.id,
                prompt=request_body.prompt,
                source_image_url=request_body.sourceImageUrl,
                service=video_task_service,
                request_id=request_id,
            )
        )
        logger.info(f"[{request_id}] Scheduled Runway processing for task {task.id}")

    # Add debug info
    task.debug = DebugInfo(requestId=request_id)

    return task


@router.patch(
    "/{task_id}/status",
    response_model=VideoTask,
    responses={
        200: {"description": "Status updated successfully"},
        403: {
            "description": "Not authorized to update this task",
            "content": {
                "application/json": {
                    "example": {
                        "code": "FORBIDDEN",
                        "message": "You do not have permission to access this task",
                        "requestId": "req_xxx",
                    }
                }
            },
        },
        404: {
            "description": "Task not found",
            "content": {
                "application/json": {
                    "example": {
                        "code": "NOT_FOUND",
                        "message": "Video task not found",
                        "requestId": "req_xxx",
                    }
                }
            },
        },
        409: {
            "description": "Illegal state transition",
            "content": {
                "application/json": {
                    "example": {
                        "code": "ILLEGAL_STATE_TRANSITION",
                        "message": "Cannot transition from completed to processing",
                        "requestId": "req_xxx",
                    }
                }
            },
        },
        422: {
            "description": "Field constraint violation",
            "content": {
                "application/json": {
                    "example": {
                        "code": "VALIDATION_ERROR",
                        "message": "videoUrl is required for completed status",
                        "requestId": "req_xxx",
                    }
                }
            },
        },
    },
)
async def update_task_status(
    task_id: str,
    request_body: UpdateStatusRequest,
    request: Request,
    user: AuthUser = Depends(get_current_user),
) -> VideoTask:
    """
    Update task status (BE-STG8 PATCH).

    **State machine (strict transitions only):**
    - queued → processing, failed, cancelled
    - processing → completed, failed, cancelled

    **Field constraints:**
    - **processing**: videoUrl=null, errorMessage=null, progress 0-99
    - **completed**: progress=100, videoUrl required, errorMessage=null
    - **failed**: errorMessage required, videoUrl=null

    Returns 404 if not found, 403 if not owned by current user.
    """
    request_id = getattr(request.state, "request_id", "unknown")
    logger.info(
        f"[{request_id}] PATCH /api/video-tasks/{task_id}/status | "
        f"user={user.id[:8]}... status={request_body.status.value}"
    )

    # BE-STG12-007: Check existence and ownership separately
    task, err = _check_task_ownership(task_id, user.id, request_id)
    if err:
        return err

    # Validate state transition
    if not video_task_service.validate_transition(task.status, request_body.status):
        logger.warning(
            f"[{request_id}] Illegal transition: {task.status.value} -> {request_body.status.value}"
        )
        return error_response(
            status_code=409,
            code="ILLEGAL_STATE_TRANSITION",
            message=f"Cannot transition from {task.status.value} to {request_body.status.value}",
            request_id=request_id,
            details={
                "currentStatus": task.status.value,
                "requestedStatus": request_body.status.value,
            },
        )

    # Validate field constraints
    constraint_error = video_task_service.validate_status_constraints(
        request_body.status,
        request_body.progress,
        request_body.videoUrl,
        request_body.errorMessage,
    )
    if constraint_error:
        logger.warning(f"[{request_id}] Constraint violation: {constraint_error}")
        return error_response(
            status_code=422,
            code="VALIDATION_ERROR",
            message=constraint_error,
            request_id=request_id,
            details={"status": request_body.status.value},
        )

    # Update task (uses service_client internally - RLS already validated above)
    updated_task = video_task_service.update_task_status(
        task_id=task_id,
        status=request_body.status,
        progress=request_body.progress,
        video_url=request_body.videoUrl,
        error_message=request_body.errorMessage,
    )

    logger.info(
        f"[{request_id}] Task {task_id} updated: "
        f"status={updated_task.status.value} progress={updated_task.progress}"
    )

    # Add debug info
    updated_task.debug = DebugInfo(requestId=request_id)

    return updated_task


@router.get(
    "/{task_id}",
    response_model=VideoTask,
    responses={
        200: {"description": "Task details"},
        403: {
            "description": "Not authorized to access this task",
            "content": {
                "application/json": {
                    "example": {
                        "code": "FORBIDDEN",
                        "message": "You do not have permission to access this task",
                        "requestId": "req_xxx",
                    }
                }
            },
        },
        404: {
            "description": "Task not found",
            "content": {
                "application/json": {
                    "example": {
                        "code": "NOT_FOUND",
                        "message": "Video task not found",
                        "requestId": "req_xxx",
                    }
                }
            },
        },
    },
)
async def get_video_task(
    task_id: str,
    request: Request,
    user: AuthUser = Depends(get_current_user),
) -> VideoTask:
    """
    Get a single video task by ID (BE-AUTH-001: auth required).

    - **task_id**: Unique task identifier (e.g., vt_abc12345)

    Response includes diagnostic fields:
    - **updatedAt**: Last update timestamp
    - **progress**: 0-100 based on status
    - **debug**: Request tracing info

    Returns 404 if task not found, 403 if not owned by current user.
    """
    request_id = getattr(request.state, "request_id", "unknown")
    logger.info(f"[{request_id}] GET /api/video-tasks/{task_id} | user={user.id[:8]}...")

    # BE-STG12-007: Check existence and ownership separately
    task, err = _check_task_ownership(task_id, user.id, request_id)
    if err:
        return err

    # Inject debug info
    task.debug = DebugInfo(requestId=request_id)

    logger.info(f"[{request_id}] Task {task.id}: status={task.status.value}, progress={task.progress}")

    if task.status.value == "completed":
        logger.info(f"[{request_id}] Status: completed, videoUrl: {task.videoUrl}")
    elif task.status.value == "failed":
        logger.info(f"[{request_id}] Status: failed, errorMessage: {task.errorMessage}")

    return task


@router.delete(
    "/{task_id}",
    status_code=204,
    responses={
        204: {"description": "Task deleted successfully"},
        403: {
            "description": "Not authorized to delete this task",
            "content": {
                "application/json": {
                    "example": {
                        "code": "FORBIDDEN",
                        "message": "You do not have permission to access this task",
                        "requestId": "req_xxx",
                    }
                }
            },
        },
        404: {
            "description": "Task not found",
            "content": {
                "application/json": {
                    "example": {
                        "code": "NOT_FOUND",
                        "message": "Video task not found",
                        "requestId": "req_xxx",
                    }
                }
            },
        },
    },
)
async def delete_video_task(
    task_id: str,
    request: Request,
    user: AuthUser = Depends(get_current_user),
):
    """
    Delete a video task by ID (BE-AUTH-001: auth required).

    - **task_id**: Unique task identifier (e.g., vt_abc12345)

    Returns 204 No Content on success, 404 if not found, 403 if not owned.
    """
    request_id = getattr(request.state, "request_id", "unknown")
    logger.info(f"[{request_id}] DELETE /api/video-tasks/{task_id} | user={user.id[:8]}...")

    # BE-STG12-007: Check existence and ownership separately
    task, err = _check_task_ownership(task_id, user.id, request_id)
    if err:
        return err

    # Delete task using user_client for RLS
    user_client = get_user_client(user.jwt_token)
    video_task_service.delete_task(user_client, task_id, user_id=user.id)
    logger.info(f"[{request_id}] Deleted task {task_id} | user={user.id[:8]}...")

    return Response(status_code=204)


@router.post(
    "/{task_id}/cancel",
    response_model=VideoTask,
    responses={
        200: {"description": "Task cancelled successfully"},
        403: {
            "description": "Not authorized to cancel this task",
            "content": {
                "application/json": {
                    "example": {
                        "code": "FORBIDDEN",
                        "message": "You do not have permission to access this task",
                        "requestId": "req_xxx",
                    }
                }
            },
        },
        404: {
            "description": "Task not found",
            "content": {
                "application/json": {
                    "example": {
                        "code": "NOT_FOUND",
                        "message": "Video task not found",
                        "requestId": "req_xxx",
                    }
                }
            },
        },
        409: {
            "description": "Task cannot be cancelled (already completed/failed/cancelled)",
            "content": {
                "application/json": {
                    "example": {
                        "code": "ILLEGAL_STATE_TRANSITION",
                        "message": "Cannot cancel task in completed state",
                        "requestId": "req_xxx",
                    }
                }
            },
        },
    },
)
async def cancel_video_task(
    task_id: str,
    request: Request,
    user: AuthUser = Depends(get_current_user),
) -> VideoTask:
    """
    Cancel a video task (BE-STG13-008).

    - **task_id**: Unique task identifier (e.g., vt_abc12345)

    Only tasks in `queued` or `processing` state can be cancelled.
    Background processing will stop at the next checkpoint.

    Returns 404 if not found, 403 if not owned, 409 if already terminal.
    """
    request_id = getattr(request.state, "request_id", "unknown")
    logger.info(f"[{request_id}] POST /api/video-tasks/{task_id}/cancel | user={user.id[:8]}...")

    # Check existence and ownership
    task, err = _check_task_ownership(task_id, user.id, request_id)
    if err:
        return err

    # Validate state transition (only queued/processing can be cancelled)
    if not video_task_service.validate_transition(task.status, VideoTaskStatus.cancelled):
        logger.warning(
            f"[{request_id}] Cannot cancel task in {task.status.value} state"
        )
        return error_response(
            status_code=409,
            code="ILLEGAL_STATE_TRANSITION",
            message=f"Cannot cancel task in {task.status.value} state",
            request_id=request_id,
            details={
                "currentStatus": task.status.value,
                "requestedStatus": "cancelled",
            },
        )

    # Update task to cancelled
    updated_task = video_task_service.update_task_status(
        task_id=task_id,
        status=VideoTaskStatus.cancelled,
        request_id=request_id,
    )

    logger.info(f"[{request_id}] Task {task_id} cancelled | user={user.id[:8]}...")

    # Add debug info
    updated_task.debug = DebugInfo(requestId=request_id)

    return updated_task
