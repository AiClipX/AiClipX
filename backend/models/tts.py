# -*- coding: utf-8 -*-
"""Pydantic models for TTS API endpoint."""

from typing import Optional
from pydantic import BaseModel, Field, model_validator


class TTSRequest(BaseModel):
    """Request body for POST /api/tts."""

    text: Optional[str] = Field(
        None,
        min_length=1,
        max_length=5000,
        description="Plain text to synthesize (required if ssml not provided)",
        json_schema_extra={"example": "Hello, this is AiClipX."},
    )
    voice: Optional[str] = Field(
        None,
        min_length=1,
        max_length=100,
        description="Azure voice name (required if ssml not provided)",
        json_schema_extra={"example": "en-US-JennyNeural"},
    )
    locale: Optional[str] = Field(
        "en-US",
        min_length=2,
        max_length=20,
        description="Language locale for SSML",
        json_schema_extra={"example": "en-US"},
    )
    format: Optional[str] = Field(
        None,
        description="Audio output format (defaults to AZURE_TTS_OUTPUT_FORMAT env var)",
        json_schema_extra={"example": "audio-24khz-48kbitrate-mono-mp3"},
    )
    ssml: Optional[str] = Field(
        None,
        max_length=50000,
        description="Raw SSML to send directly to Azure (if provided, text/voice ignored)",
        json_schema_extra={
            "example": '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><voice name="en-US-JennyNeural">Hello!</voice></speak>'
        },
    )

    @model_validator(mode="after")
    def validate_text_or_ssml(self):
        """Ensure either text or ssml is provided."""
        if not self.text and not self.ssml:
            raise ValueError("Either 'text' or 'ssml' must be provided")
        if self.text and not self.ssml and not self.voice:
            raise ValueError("'voice' is required when using 'text' (not ssml)")
        return self

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "text": "Hello, this is AiClipX speaking.",
                    "voice": "en-US-JennyNeural",
                    "locale": "en-US",
                },
                {
                    "ssml": '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><voice name="en-US-JennyNeural">Hello from SSML!</voice></speak>'
                },
            ]
        }
    }


class TTSResponse(BaseModel):
    """Response body for POST /api/tts."""

    requestId: str = Field(..., description="Request tracking ID")
    audioUrl: str = Field(..., description="URL to the generated MP3 file")
    contentType: str = Field(
        "audio/mpeg", description="MIME type of the audio file"
    )
    bytes: int = Field(..., description="Size of the audio file in bytes")
    voice: str = Field(..., description="Voice name used for synthesis")
    format: str = Field(..., description="Audio output format used")

    model_config = {
        "json_schema_extra": {
            "example": {
                "requestId": "req_abc12345",
                "audioUrl": "https://xxx.supabase.co/storage/v1/object/public/outputs/tts/20260105/abc123.mp3",
                "contentType": "audio/mpeg",
                "bytes": 18432,
                "voice": "en-US-JennyNeural",
                "format": "audio-24khz-48kbitrate-mono-mp3",
            }
        }
    }
