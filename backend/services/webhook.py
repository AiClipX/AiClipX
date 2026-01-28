# -*- coding: utf-8 -*-
"""
BE-STG13-010: Webhook service for push notifications.

Emits events on task lifecycle transitions to configured endpoint.
Supports HMAC signature verification and retry with backoff.
"""
import asyncio
import hashlib
import hmac
import json
import logging
import os
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

import httpx

logger = logging.getLogger(__name__)

# Retry configuration
RETRY_DELAYS = [1, 5, 30]  # seconds between retries
MAX_RETRIES = 3
DELIVERY_TIMEOUT = 5.0  # seconds


class WebhookService:
    """Service for delivering webhook events with retry and signature."""

    def __init__(self):
        self.url = os.getenv("WEBHOOK_URL", "").strip()
        self.secret = os.getenv("WEBHOOK_SECRET", "").strip()
        self.enabled = bool(self.url and self.secret)

        if self.enabled:
            logger.info(f"Webhook enabled: {self.url[:30]}...")
        else:
            logger.info("Webhook disabled (WEBHOOK_URL or WEBHOOK_SECRET not configured)")

    def _generate_event_id(self) -> str:
        """Generate unique event ID."""
        return f"evt_{uuid4().hex[:16]}"

    def _build_payload(
        self,
        event_type: str,
        task_id: str,
        task_status: str,
        task_title: str,
        task_engine: str,
        task_created_at: datetime,
        request_id: str,
        video_url: Optional[str] = None,
        error_code: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> dict:
        """Build webhook event payload."""
        payload = {
            "eventId": self._generate_event_id(),
            "eventType": event_type,
            "occurredAt": datetime.now(timezone.utc).isoformat(),
            "requestId": request_id,
            "task": {
                "id": task_id,
                "status": task_status,
                "title": task_title,
                "engine": task_engine,
                "createdAt": task_created_at.isoformat() if task_created_at else None,
            },
        }

        # Add optional fields based on event type
        if video_url:
            payload["task"]["videoUrl"] = video_url
        if error_code:
            payload["task"]["errorCode"] = error_code
        if error_message:
            payload["task"]["errorMessage"] = error_message

        return payload

    def _sign_payload(self, payload_json: str) -> str:
        """Generate HMAC-SHA256 signature for payload."""
        return hmac.new(
            self.secret.encode("utf-8"),
            payload_json.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

    async def _deliver_with_retry(
        self,
        payload_json: str,
        signature: str,
        request_id: str,
        event_type: str,
    ) -> bool:
        """Deliver webhook with retry on failure."""
        headers = {
            "Content-Type": "application/json",
            "X-AiClipX-Signature": f"sha256={signature}",
            "X-AiClipX-Event": event_type,
            "X-Request-Id": request_id,
        }

        for attempt in range(MAX_RETRIES):
            try:
                async with httpx.AsyncClient(timeout=DELIVERY_TIMEOUT) as client:
                    response = await client.post(
                        self.url,
                        content=payload_json,
                        headers=headers,
                    )

                logger.info(
                    f"[{request_id}] Webhook {event_type} attempt {attempt + 1}: "
                    f"status={response.status_code}"
                )

                if response.status_code < 300:
                    return True

                # Non-2xx, will retry
                logger.warning(
                    f"[{request_id}] Webhook {event_type} non-2xx response: {response.status_code}"
                )

            except httpx.TimeoutException:
                logger.warning(
                    f"[{request_id}] Webhook {event_type} attempt {attempt + 1}: timeout"
                )
            except httpx.RequestError as e:
                logger.warning(
                    f"[{request_id}] Webhook {event_type} attempt {attempt + 1}: {type(e).__name__}"
                )
            except Exception as e:
                logger.error(
                    f"[{request_id}] Webhook {event_type} attempt {attempt + 1}: unexpected error {type(e).__name__}"
                )

            # Wait before retry (except on last attempt)
            if attempt < MAX_RETRIES - 1:
                delay = RETRY_DELAYS[attempt] if attempt < len(RETRY_DELAYS) else RETRY_DELAYS[-1]
                await asyncio.sleep(delay)

        logger.error(
            f"[{request_id}] Webhook {event_type} delivery failed after {MAX_RETRIES} attempts"
        )
        return False

    async def emit_event(
        self,
        event_type: str,
        task_id: str,
        task_status: str,
        task_title: str,
        task_engine: str,
        task_created_at: datetime,
        request_id: str,
        video_url: Optional[str] = None,
        error_code: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> bool:
        """
        Emit a webhook event.

        Args:
            event_type: One of video_task.created, video_task.processing_started,
                       video_task.completed, video_task.failed, video_task.cancelled
            task_id: Video task ID
            task_status: Current task status
            task_title: Task title
            task_engine: Engine used (mock/runway)
            task_created_at: Task creation timestamp
            request_id: Request ID for correlation
            video_url: Signed video URL (for completed events)
            error_code: Error code (for failed events)
            error_message: User-safe error message (for failed events)

        Returns:
            True if delivered successfully, False otherwise
        """
        if not self.enabled:
            return True  # Silently succeed if webhooks disabled

        # Build payload
        payload = self._build_payload(
            event_type=event_type,
            task_id=task_id,
            task_status=task_status,
            task_title=task_title,
            task_engine=task_engine,
            task_created_at=task_created_at,
            request_id=request_id,
            video_url=video_url,
            error_code=error_code,
            error_message=error_message,
        )

        # Serialize and sign
        payload_json = json.dumps(payload, default=str)
        signature = self._sign_payload(payload_json)

        # Deliver with retry
        return await self._deliver_with_retry(
            payload_json=payload_json,
            signature=signature,
            request_id=request_id,
            event_type=event_type,
        )


# Singleton instance
webhook_service = WebhookService()
