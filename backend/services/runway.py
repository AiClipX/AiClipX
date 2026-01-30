# -*- coding: utf-8 -*-
"""
Runway API service for image-to-video generation.

Docs: https://docs.dev.runwayml.com/guides/using-the-api/
API Reference: https://docs.dev.runwayml.com/api/

BE-STG13-017: Added retry policy and circuit breaker for resilience.
"""

import asyncio
import logging
import os
from dataclasses import dataclass
from enum import Enum
from typing import Optional

import httpx

from services.resilience import (
    retry_policy,
    runway_circuit_breaker,
    EngineErrorCode,
    get_error_message,
    map_status_to_error_code,
)

logger = logging.getLogger(__name__)

# Environment variable name
RUNWAY_API_KEY_ENV = "RUNWAY_API_KEY"

# API Configuration
RUNWAY_API_BASE = "https://api.dev.runwayml.com/v1"
RUNWAY_API_VERSION = "2024-11-06"
DEFAULT_MODEL = "gen4_turbo"
DEFAULT_DURATION = 5
DEFAULT_RATIO = "1280:720"

# Timeout for HTTP requests (seconds)
HTTP_TIMEOUT = 30.0

# Shared HTTP client for connection pooling (singleton)
_http_client: Optional[httpx.AsyncClient] = None


def get_http_client() -> httpx.AsyncClient:
    """Get or create shared HTTP client for connection pooling."""
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(
            timeout=HTTP_TIMEOUT,
            limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
        )
    return _http_client


async def close_http_client():
    """Close the shared HTTP client (call on shutdown)."""
    global _http_client
    if _http_client is not None and not _http_client.is_closed:
        await _http_client.aclose()
        _http_client = None


class RunwayConfigError(Exception):
    """Raised when Runway API is not properly configured."""
    pass


class RunwayAPIError(Exception):
    """Raised when Runway API returns an error."""
    def __init__(
        self,
        message: str,
        status_code: Optional[int] = None,
        error_code: Optional[EngineErrorCode] = None,
    ):
        super().__init__(message)
        self.status_code = status_code
        self.error_code = error_code or map_status_to_error_code(status_code)


class RunwayTaskStatus(str, Enum):
    """Runway task status values."""
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    CANCELED = "CANCELED"


@dataclass
class RunwayTaskResult:
    """Result from Runway task polling."""
    task_id: str
    status: RunwayTaskStatus
    progress: int  # 0-100
    output_url: Optional[str] = None  # Video URL when SUCCEEDED
    error_message: Optional[str] = None  # Error when FAILED


def get_runway_api_key() -> str:
    """
    Get Runway API key from environment.

    Returns:
        str: API key

    Raises:
        RunwayConfigError: If API key is not configured
    """
    api_key = os.getenv(RUNWAY_API_KEY_ENV, "").strip()

    if not api_key:
        raise RunwayConfigError(
            f"{RUNWAY_API_KEY_ENV} environment variable is required but not set. "
            "Get your API key from https://dev.runwayml.com/"
        )

    return api_key


def _get_headers() -> dict:
    """Get headers for Runway API requests."""
    api_key = get_runway_api_key()
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
        "X-Runway-Version": RUNWAY_API_VERSION,
    }


async def create_image_to_video_task(
    prompt_image_url: str,
    prompt_text: str,
    model: str = DEFAULT_MODEL,
    duration: int = DEFAULT_DURATION,
    ratio: str = DEFAULT_RATIO,
    request_id: str = "unknown",
) -> str:
    """
    Create an image-to-video generation task.

    BE-STG13-017: Includes retry policy and circuit breaker.

    Args:
        prompt_image_url: URL of the source image
        prompt_text: Text prompt for video generation
        model: Runway model (default: gen4_turbo)
        duration: Video duration in seconds (default: 5)
        ratio: Aspect ratio (default: 1280:720)
        request_id: Request ID for logging

    Returns:
        str: Task ID for polling

    Raises:
        RunwayConfigError: If API key is not configured
        RunwayAPIError: If API request fails (after retries exhausted)
    """
    # BE-STG13-017: Check circuit breaker
    if not runway_circuit_breaker.can_attempt():
        logger.warning(f"[{request_id}] Runway circuit OPEN - rejecting request")
        raise RunwayAPIError(
            get_error_message(EngineErrorCode.ENGINE_CIRCUIT_OPEN),
            error_code=EngineErrorCode.ENGINE_CIRCUIT_OPEN,
        )

    logger.info(
        f"[{request_id}] Runway create task: model={model}, duration={duration}, ratio={ratio}"
    )

    payload = {
        "promptImage": prompt_image_url,
        "promptText": prompt_text,
        "model": model,
        "duration": duration,
        "ratio": ratio,
    }

    client = get_http_client()
    last_error: Optional[Exception] = None
    last_status: Optional[int] = None

    # BE-STG13-017: Retry loop with exponential backoff
    for attempt in range(1, retry_policy.MAX_ATTEMPTS + 1):
        try:
            # Delay before retry (not on first attempt)
            delay = retry_policy.get_delay(attempt)
            if delay > 0:
                logger.info(f"[{request_id}] Retry attempt {attempt}, waiting {delay}s...")
                await asyncio.sleep(delay)

            response = await client.post(
                f"{RUNWAY_API_BASE}/image_to_video",
                headers=_get_headers(),
                json=payload,
            )

            if response.status_code in (200, 201):
                data = response.json()
                task_id = data.get("id")

                if not task_id:
                    raise RunwayAPIError("Runway API did not return task ID")

                # Success - record and return
                runway_circuit_breaker.record_success()
                logger.info(f"[{request_id}] Runway task created: task_id={task_id}")
                return task_id

            # Error response
            last_status = response.status_code
            error_detail = response.text[:200] if response.text else "Unknown error"
            logger.error(
                f"[{request_id}] Runway API error (attempt {attempt}): "
                f"status={response.status_code}, detail={error_detail}"
            )

            # Check if retryable
            if not retry_policy.is_retryable(status_code=response.status_code):
                logger.info(f"[{request_id}] Non-retryable error {response.status_code}, failing fast")
                runway_circuit_breaker.record_failure()
                raise RunwayAPIError(
                    f"Runway API error: {error_detail}",
                    status_code=response.status_code,
                )

            last_error = RunwayAPIError(
                f"Runway API error: {error_detail}",
                status_code=response.status_code,
            )

        except httpx.RequestError as e:
            logger.error(f"[{request_id}] Runway request failed (attempt {attempt}): {e}")
            last_error = e
            last_status = None

            # Network errors are retryable
            if not retry_policy.should_retry(attempt):
                break

    # All retries exhausted
    runway_circuit_breaker.record_failure()
    error_code = map_status_to_error_code(last_status)
    raise RunwayAPIError(
        f"Failed after {retry_policy.MAX_ATTEMPTS} attempts: {last_error}",
        status_code=last_status,
        error_code=error_code,
    )


async def get_task_status(
    task_id: str,
    request_id: str = "unknown",
) -> RunwayTaskResult:
    """
    Get the status of a Runway task.

    BE-STG13-017: Includes retry policy and circuit breaker.

    Args:
        task_id: Runway task ID
        request_id: Request ID for logging

    Returns:
        RunwayTaskResult: Task status and output

    Raises:
        RunwayConfigError: If API key is not configured
        RunwayAPIError: If API request fails (after retries exhausted)
    """
    # BE-STG13-017: Check circuit breaker
    if not runway_circuit_breaker.can_attempt():
        logger.warning(f"[{request_id}] Runway circuit OPEN - rejecting poll request")
        raise RunwayAPIError(
            get_error_message(EngineErrorCode.ENGINE_CIRCUIT_OPEN),
            error_code=EngineErrorCode.ENGINE_CIRCUIT_OPEN,
        )

    client = get_http_client()
    last_error: Optional[Exception] = None
    last_status: Optional[int] = None

    # BE-STG13-017: Retry loop
    for attempt in range(1, retry_policy.MAX_ATTEMPTS + 1):
        try:
            delay = retry_policy.get_delay(attempt)
            if delay > 0:
                logger.info(f"[{request_id}] Poll retry attempt {attempt}, waiting {delay}s...")
                await asyncio.sleep(delay)

            response = await client.get(
                f"{RUNWAY_API_BASE}/tasks/{task_id}",
                headers=_get_headers(),
            )

            if response.status_code == 200:
                data = response.json()
                status_str = data.get("status", "PENDING")

                # Map status to progress
                progress = 0
                if status_str == "RUNNING":
                    progress = 50
                elif status_str == "SUCCEEDED":
                    progress = 100
                elif status_str == "FAILED" or status_str == "CANCELED":
                    progress = 0

                # Get output URL if succeeded
                output_url = None
                if status_str == "SUCCEEDED":
                    output = data.get("output", [])
                    if output and len(output) > 0:
                        output_url = output[0]

                # Get error message if failed
                error_message = None
                if status_str == "FAILED":
                    error_message = data.get("failure", data.get("failureCode", "Unknown error"))
                elif status_str == "CANCELED":
                    error_message = "Task was canceled"

                logger.info(
                    f"[{request_id}] Runway task {task_id}: status={status_str}, progress={progress}"
                )

                # Success - record and return
                runway_circuit_breaker.record_success()
                return RunwayTaskResult(
                    task_id=task_id,
                    status=RunwayTaskStatus(status_str),
                    progress=progress,
                    output_url=output_url,
                    error_message=error_message,
                )

            # Error response
            last_status = response.status_code
            error_detail = response.text[:200] if response.text else "Unknown error"
            logger.error(
                f"[{request_id}] Runway get task error (attempt {attempt}): "
                f"status={response.status_code}, detail={error_detail}"
            )

            if not retry_policy.is_retryable(status_code=response.status_code):
                runway_circuit_breaker.record_failure()
                raise RunwayAPIError(
                    f"Failed to get task status: {error_detail}",
                    status_code=response.status_code,
                )

            last_error = RunwayAPIError(
                f"Failed to get task status: {error_detail}",
                status_code=response.status_code,
            )

        except httpx.RequestError as e:
            logger.error(f"[{request_id}] Runway get task failed (attempt {attempt}): {e}")
            last_error = e
            last_status = None

            if not retry_policy.should_retry(attempt):
                break

    # All retries exhausted
    runway_circuit_breaker.record_failure()
    error_code = map_status_to_error_code(last_status)
    raise RunwayAPIError(
        f"Failed to get task status after {retry_policy.MAX_ATTEMPTS} attempts: {last_error}",
        status_code=last_status,
        error_code=error_code,
    )


def is_runway_configured() -> bool:
    """Check if Runway API is configured."""
    try:
        get_runway_api_key()
        return True
    except RunwayConfigError:
        return False
