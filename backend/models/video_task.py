from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class VideoTaskStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class VideoTask(BaseModel):
    """Video task model - consistent across all endpoints."""

    id: str
    title: Optional[str] = None
    status: VideoTaskStatus
    createdAt: datetime
    videoUrl: Optional[str] = None
    errorMessage: Optional[str] = None

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "examples": [
                {
                    "id": "vt_abc12345",
                    "title": "My video demo",
                    "status": "pending",
                    "createdAt": "2025-12-26T10:30:45.123Z",
                    "videoUrl": None,
                    "errorMessage": None,
                }
            ]
        },
    }


class VideoTaskListResponse(BaseModel):
    data: List[VideoTask]
    nextCursor: Optional[str] = None


class CreateVideoTaskRequest(BaseModel):
    """Request body for creating a video task. All fields optional."""

    title: Optional[str] = Field(default=None, max_length=500)
    prompt: Optional[str] = Field(default=None, max_length=2000)

    model_config = {
        "json_schema_extra": {
            "examples": [{"title": "Video demo", "prompt": "optional"}]
        }
    }
