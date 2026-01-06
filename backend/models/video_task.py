from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class VideoTaskStatus(str, Enum):
    queued = "queued"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class VideoEngine(str, Enum):
    runway = "runway"
    mock = "mock"


class DebugInfo(BaseModel):
    """Debug information for diagnostics (optional)."""

    requestId: Optional[str] = None
    worker: Optional[str] = None
    trace: Optional[str] = None


class VideoTaskParams(BaseModel):
    """Video generation parameters."""
    durationSec: int = Field(default=4, ge=1, le=60)
    ratio: str = Field(default="16:9", pattern="^(16:9|9:16|1:1|4:3)$")


class VideoTask(BaseModel):
    """Video task model - consistent across all endpoints."""

    id: str
    title: Optional[str] = None
    prompt: Optional[str] = None
    status: VideoTaskStatus
    createdAt: datetime
    updatedAt: Optional[datetime] = None
    videoUrl: Optional[str] = None
    errorMessage: Optional[str] = None
    progress: int = Field(default=0, ge=0, le=100)

    # BE-STG8 new fields
    sourceImageUrl: Optional[str] = None
    engine: Optional[str] = None
    params: Optional[VideoTaskParams] = None

    # Optional diagnostic fields
    debug: Optional[DebugInfo] = None

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "examples": [
                {
                    "id": "vt_abc12345",
                    "title": "My video demo",
                    "prompt": "A beautiful sunset",
                    "status": "queued",
                    "createdAt": "2025-12-26T10:30:45.123Z",
                    "updatedAt": "2025-12-26T10:30:45.123Z",
                    "videoUrl": None,
                    "errorMessage": None,
                    "progress": 0,
                    "sourceImageUrl": None,
                    "engine": "mock",
                    "params": {"durationSec": 4, "ratio": "16:9"},
                    "debug": {"requestId": "req_abc123"},
                }
            ]
        },
    }


class VideoTaskListResponse(BaseModel):
    data: List[VideoTask]
    nextCursor: Optional[str] = None


class CreateVideoTaskRequest(BaseModel):
    """Request body for creating a video task (BE-STG8)."""

    title: str = Field(..., min_length=1, max_length=500, description="Task title (required)")
    prompt: str = Field(..., min_length=1, max_length=2000, description="Video generation prompt (required)")
    sourceImageUrl: Optional[str] = Field(default=None, max_length=2000)
    engine: VideoEngine = Field(default=VideoEngine.mock, description="Video engine: runway or mock")
    params: Optional[VideoTaskParams] = Field(default=None, description="Generation parameters")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "title": "My video",
                    "prompt": "A beautiful sunset over the ocean",
                    "sourceImageUrl": None,
                    "engine": "mock",
                    "params": {"durationSec": 4, "ratio": "16:9"}
                }
            ]
        }
    }


class UpdateStatusRequest(BaseModel):
    """Request body for updating task status (BE-STG8 PATCH)."""

    status: VideoTaskStatus = Field(..., description="New status: processing, completed, or failed")
    progress: Optional[int] = Field(default=None, ge=0, le=100, description="Progress 0-100")
    videoUrl: Optional[str] = Field(default=None, max_length=2000, description="Video URL (required for completed)")
    errorMessage: Optional[str] = Field(default=None, max_length=2000, description="Error message (required for failed)")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"status": "processing", "progress": 50},
                {"status": "completed", "progress": 100, "videoUrl": "https://example.com/video.mp4"},
                {"status": "failed", "errorMessage": "Generation failed"}
            ]
        }
    }
