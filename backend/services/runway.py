# -*- coding: utf-8 -*-
"""
Runway API service for image-to-video generation.

Docs: https://docs.dev.runwayml.com/guides/using-the-api/
API Reference: https://docs.dev.runwayml.com/api/
"""

import logging
import os
from dataclasses import dataclass
from enum import Enum
from typing import Optional

import httpx

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


class RunwayConfigError(Exception):
    """Raised when Runway API is not properly configured."""
    pass


class RunwayAPIError(Exception):
    """Raised when Runway API returns an error."""
    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code


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
        RunwayAPIError: If API request fails
    """
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

    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
        try:
            response = await client.post(
                f"{RUNWAY_API_BASE}/image_to_video",
                headers=_get_headers(),
                json=payload,
            )

            if response.status_code != 200 and response.status_code != 201:
                error_detail = response.text[:200] if response.text else "Unknown error"
                logger.error(
                    f"[{request_id}] Runway API error: status={response.status_code}, detail={error_detail}"
                )
                raise RunwayAPIError(
                    f"Runway API error: {error_detail}",
                    status_code=response.status_code,
                )

            data = response.json()
            task_id = data.get("id")

            if not task_id:
                raise RunwayAPIError("Runway API did not return task ID")

            logger.info(f"[{request_id}] Runway task created: task_id={task_id}")
            return task_id

        except httpx.RequestError as e:
            logger.error(f"[{request_id}] Runway request failed: {e}")
            raise RunwayAPIError(f"Failed to connect to Runway API: {e}")


async def get_task_status(
    task_id: str,
    request_id: str = "unknown",
) -> RunwayTaskResult:
    """
    Get the status of a Runway task.

    Args:
        task_id: Runway task ID
        request_id: Request ID for logging

    Returns:
        RunwayTaskResult: Task status and output

    Raises:
        RunwayConfigError: If API key is not configured
        RunwayAPIError: If API request fails
    """
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
        try:
            response = await client.get(
                f"{RUNWAY_API_BASE}/tasks/{task_id}",
                headers=_get_headers(),
            )

            if response.status_code != 200:
                error_detail = response.text[:200] if response.text else "Unknown error"
                logger.error(
                    f"[{request_id}] Runway get task error: status={response.status_code}, detail={error_detail}"
                )
                raise RunwayAPIError(
                    f"Failed to get task status: {error_detail}",
                    status_code=response.status_code,
                )

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
                    output_url = output[0]  # First output URL

            # Get error message if failed
            error_message = None
            if status_str == "FAILED":
                error_message = data.get("failure", data.get("failureCode", "Unknown error"))
            elif status_str == "CANCELED":
                error_message = "Task was canceled"

            logger.info(
                f"[{request_id}] Runway task {task_id}: status={status_str}, progress={progress}"
            )

            return RunwayTaskResult(
                task_id=task_id,
                status=RunwayTaskStatus(status_str),
                progress=progress,
                output_url=output_url,
                error_message=error_message,
            )

        except httpx.RequestError as e:
            logger.error(f"[{request_id}] Runway get task failed: {e}")
            raise RunwayAPIError(f"Failed to get task status: {e}")


def is_runway_configured() -> bool:
    """Check if Runway API is configured."""
    try:
        get_runway_api_key()
        return True
    except RunwayConfigError:
        return False
