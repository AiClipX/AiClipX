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
    id: str
    title: str
    status: VideoTaskStatus
    createdAt: datetime = Field(..., alias="createdAt")
    videoUrl: Optional[str] = None
    errorMessage: Optional[str] = None

    class Config:
        populate_by_name = True


class VideoTaskListResponse(BaseModel):
    data: List[VideoTask]
    nextCursor: Optional[str] = None
