# -*- coding: utf-8 -*-
"""
BE-STG13-015: Server-Sent Events (SSE) service.

Provides real-time event delivery to connected clients:
- In-memory pub/sub using asyncio.Queue
- User-scoped event streams
- Automatic cleanup on disconnect
"""

import asyncio
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Set
from uuid import uuid4

logger = logging.getLogger(__name__)


@dataclass
class SSEEvent:
    """Server-Sent Event structure."""
    event_type: str
    event_id: str
    data: Dict[str, Any]
    occurred_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_sse_format(self) -> str:
        """Convert to SSE wire format."""
        lines = [
            f"event: {self.event_type}",
            f"id: {self.event_id}",
            f"data: {json.dumps(self.data)}",
            "",  # Empty line to end event
        ]
        return "\n".join(lines) + "\n"


class SSEService:
    """
    In-memory pub/sub service for SSE events.

    Maintains user_id -> Queue mapping for event delivery.
    Each connected client gets its own queue.
    """

    def __init__(self):
        # user_id -> set of queues (user can have multiple connections)
        self._connections: Dict[str, Set[asyncio.Queue]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, user_id: str) -> asyncio.Queue:
        """
        Register a new SSE connection for user.

        Returns queue that will receive events for this user.
        """
        queue: asyncio.Queue = asyncio.Queue()

        async with self._lock:
            if user_id not in self._connections:
                self._connections[user_id] = set()
            self._connections[user_id].add(queue)

        logger.info(f"SSE connected: user={user_id[:8]}... connections={len(self._connections[user_id])}")
        return queue

    async def disconnect(self, user_id: str, queue: asyncio.Queue) -> None:
        """
        Unregister SSE connection for user.

        Cleans up queue reference.
        """
        async with self._lock:
            if user_id in self._connections:
                self._connections[user_id].discard(queue)
                if not self._connections[user_id]:
                    del self._connections[user_id]

        logger.info(f"SSE disconnected: user={user_id[:8]}...")

    async def emit(self, user_id: str, event: SSEEvent) -> int:
        """
        Emit event to all connections for a user.

        Returns number of queues that received the event.
        """
        async with self._lock:
            queues = self._connections.get(user_id, set())
            count = 0
            for queue in queues:
                try:
                    await queue.put(event)
                    count += 1
                except Exception as e:
                    logger.warning(f"Failed to emit to queue: {e}")

        if count > 0:
            logger.debug(f"SSE emit: user={user_id[:8]}... type={event.event_type} queues={count}")

        return count

    async def emit_task_event(
        self,
        user_id: str,
        event_type: str,
        task_id: str,
        request_id: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> int:
        """
        Emit a task lifecycle event.

        Convenience method that builds proper event payload.
        """
        event_id = f"evt_{uuid4().hex[:12]}"

        event_data = {
            "eventId": event_id,
            "eventType": event_type,
            "occurredAt": datetime.now(timezone.utc).isoformat(),
            "requestId": request_id,
            "taskId": task_id,
            "data": data or {},
        }

        event = SSEEvent(
            event_type=event_type,
            event_id=event_id,
            data=event_data,
        )

        count = await self.emit(user_id, event)

        if count > 0:
            logger.info(
                f"[{request_id}] SSE event emitted: type={event_type} "
                f"task={task_id[:8]}... user={user_id[:8]}... clients={count}"
            )

        return count

    def get_connected_users_count(self) -> int:
        """Get number of users with active connections."""
        return len(self._connections)

    def get_total_connections_count(self) -> int:
        """Get total number of active connections."""
        return sum(len(queues) for queues in self._connections.values())

    def is_user_connected(self, user_id: str) -> bool:
        """Check if user has any active connections."""
        return user_id in self._connections and len(self._connections[user_id]) > 0


# Singleton instance
sse_service = SSEService()
