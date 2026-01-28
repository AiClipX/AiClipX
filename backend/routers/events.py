# -*- coding: utf-8 -*-
"""
BE-STG13-015: Server-Sent Events (SSE) endpoint.

GET /api/events?token=JWT - User-scoped event stream

Features:
- Real-time task lifecycle events
- JWT auth via query param (SSE limitation)
- Heartbeat every 30 seconds
- Max connection duration 30 minutes
- Last-Event-ID support for resume
"""

import asyncio
import logging
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Query, Request
from fastapi.responses import StreamingResponse

from services.sse import sse_service, SSEEvent
from services.auth import verify_jwt, AuthError
from services.error_response import error_response

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Events"])

# Configuration
HEARTBEAT_INTERVAL = 30  # seconds
MAX_CONNECTION_DURATION = 30 * 60  # 30 minutes in seconds


def is_sse_enabled() -> bool:
    """Check if SSE events feature is enabled."""
    return os.getenv("SSE_EVENTS_ENABLED", "true").lower() == "true"


async def event_generator(
    user_id: str,
    queue: asyncio.Queue,
    request_id: str,
    last_event_id: str | None = None,
):
    """
    Generate SSE events for a connected client.

    Yields:
    - Task events from queue
    - Heartbeat every HEARTBEAT_INTERVAL seconds
    - Stops after MAX_CONNECTION_DURATION
    """
    start_time = datetime.now(timezone.utc)
    logger.info(f"[{request_id}] SSE stream started: user={user_id[:8]}...")

    try:
        while True:
            # Check max duration
            elapsed = (datetime.now(timezone.utc) - start_time).total_seconds()
            if elapsed >= MAX_CONNECTION_DURATION:
                logger.info(f"[{request_id}] SSE max duration reached: user={user_id[:8]}...")
                # Send close event
                yield f"event: connection.closing\ndata: {{\"reason\":\"max_duration\"}}\n\n"
                break

            try:
                # Wait for event with timeout for heartbeat
                event: SSEEvent = await asyncio.wait_for(
                    queue.get(),
                    timeout=HEARTBEAT_INTERVAL
                )

                # Yield the event
                yield event.to_sse_format()

            except asyncio.TimeoutError:
                # Send heartbeat
                yield ": heartbeat\n\n"

    except asyncio.CancelledError:
        logger.info(f"[{request_id}] SSE stream cancelled: user={user_id[:8]}...")
        raise

    except Exception as e:
        logger.error(f"[{request_id}] SSE stream error: {e}")
        raise

    finally:
        # Cleanup connection
        await sse_service.disconnect(user_id, queue)
        logger.info(f"[{request_id}] SSE stream ended: user={user_id[:8]}...")


@router.get(
    "/events",
    responses={
        200: {"description": "SSE event stream"},
        401: {"description": "Invalid or missing token"},
        503: {"description": "SSE events disabled"},
    },
)
async def stream_events(
    request: Request,
    token: str = Query(..., description="JWT access token"),
):
    """
    Subscribe to real-time task events via Server-Sent Events.

    **Authentication:** Pass JWT token in query param (SSE limitation).

    **Events:**
    - `task.created` - Task was created
    - `task.processing_started` - Processing began
    - `task.completed` - Task completed (includes videoUrl)
    - `task.failed` - Task failed (includes errorCode, errorMessage)
    - `task.cancelled` - Task was cancelled

    **Connection:**
    - Heartbeat every 30 seconds
    - Max duration 30 minutes, then reconnect
    - Use `Last-Event-ID` header for resume (best effort)

    **Example:**
    ```
    curl -N "https://api.example.com/api/events?token=YOUR_JWT"
    ```
    """
    request_id = getattr(request.state, "request_id", "unknown")

    # Check if feature is enabled
    if not is_sse_enabled():
        logger.info(f"[{request_id}] SSE disabled, returning 503")
        return error_response(
            status_code=503,
            code="SSE_EVENTS_DISABLED",
            message="Real-time events are currently disabled",
            request_id=request_id,
        )

    # Validate JWT token
    try:
        payload = verify_jwt(token)
        user_id = payload.get("sub")

        if not user_id:
            logger.warning(f"[{request_id}] SSE auth failed: no user_id in token")
            return error_response(
                status_code=401,
                code="INVALID_TOKEN",
                message="Invalid token: missing user ID",
                request_id=request_id,
            )

    except AuthError as e:
        logger.warning(f"[{request_id}] SSE auth failed: {e}")
        return error_response(
            status_code=401,
            code="INVALID_TOKEN",
            message=f"Invalid token: {e}",
            request_id=request_id,
        )

    # Get Last-Event-ID for resume (best effort)
    last_event_id = request.headers.get("Last-Event-ID")

    # Register connection
    queue = await sse_service.connect(user_id)

    logger.info(
        f"[{request_id}] SSE connection accepted: user={user_id[:8]}... "
        f"last_event_id={last_event_id or '-'}"
    )

    # Return streaming response
    return StreamingResponse(
        event_generator(user_id, queue, request_id, last_event_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
            "X-Request-Id": request_id,
        },
    )


@router.get("/events/stats")
async def get_sse_stats(request: Request):
    """
    Get SSE connection statistics (for monitoring).

    Returns count of connected users and total connections.
    """
    request_id = getattr(request.state, "request_id", "unknown")

    return {
        "connectedUsers": sse_service.get_connected_users_count(),
        "totalConnections": sse_service.get_total_connections_count(),
        "requestId": request_id,
    }
