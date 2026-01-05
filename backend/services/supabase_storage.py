# -*- coding: utf-8 -*-
"""Supabase Storage service for uploading and managing output assets."""

import logging
import os
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import uuid4

from supabase import create_client, Client

logger = logging.getLogger(__name__)


class SupabaseConfigError(Exception):
    """Raised when Supabase configuration is missing or invalid."""

    pass


class SupabaseUploadError(Exception):
    """Raised when Supabase upload fails."""

    pass


@dataclass
class UploadResult:
    """Result from Supabase storage upload."""

    url: str
    path: str
    bucket: str
    bytes: int
    signed_url: Optional[str] = None
    expires_in: Optional[int] = None


_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """
    Get or create Supabase client singleton.

    Returns:
        Client: Supabase client

    Raises:
        SupabaseConfigError: If Supabase is not properly configured
    """
    global _client

    if _client is not None:
        return _client

    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_KEY", "").strip()

    if not url:
        raise SupabaseConfigError("SUPABASE_URL is not configured")
    if not key:
        raise SupabaseConfigError("SUPABASE_SERVICE_KEY is not configured")

    # Ensure URL has trailing slash to avoid Supabase warning
    if not url.endswith("/"):
        url = url + "/"

    _client = create_client(url, key)
    return _client


def get_outputs_bucket() -> str:
    """Get the outputs bucket name from environment."""
    bucket = os.getenv("SUPABASE_OUTPUTS_BUCKET", "outputs").strip()
    return bucket


def generate_tts_path() -> str:
    """
    Generate a unique path for TTS audio file.

    Format: tts/{yyyyMMdd}/{uuid}.mp3

    Returns:
        str: Unique file path
    """
    date_folder = datetime.utcnow().strftime("%Y%m%d")
    unique_id = uuid4().hex[:12]
    return f"tts/{date_folder}/{unique_id}.mp3"


async def upload_audio(
    audio_bytes: bytes,
    content_type: str = "audio/mpeg",
    request_id: str = "unknown",
) -> UploadResult:
    """
    Upload audio bytes to Supabase storage.

    Args:
        audio_bytes: Audio file content
        content_type: MIME type of the audio
        request_id: Request ID for logging

    Returns:
        UploadResult: Upload result with URL and metadata

    Raises:
        SupabaseConfigError: If Supabase is not properly configured
        SupabaseUploadError: If upload fails
    """
    client = get_supabase_client()
    bucket = get_outputs_bucket()
    file_path = generate_tts_path()

    logger.info(
        f"[{request_id}] Supabase upload: bucket={bucket}, path={file_path}, size={len(audio_bytes)}"
    )

    try:
        # Upload file
        response = client.storage.from_(bucket).upload(
            path=file_path,
            file=audio_bytes,
            file_options={
                "content-type": content_type,
                "cache-control": "3600",
                "upsert": "false",
            },
        )

        # Check for upload error
        if hasattr(response, "error") and response.error:
            raise SupabaseUploadError(f"Upload failed: {response.error}")

    except Exception as e:
        if isinstance(e, SupabaseUploadError):
            raise
        logger.error(f"[{request_id}] Supabase upload failed: {e}")
        raise SupabaseUploadError(f"Failed to upload audio: {e}")

    # Try to get public URL first
    try:
        public_url_response = client.storage.from_(bucket).get_public_url(file_path)
        public_url = public_url_response

        logger.info(f"[{request_id}] Supabase upload success: {file_path}")

        return UploadResult(
            url=public_url,
            path=file_path,
            bucket=bucket,
            bytes=len(audio_bytes),
        )
    except Exception:
        # Bucket is private, create signed URL
        logger.info(f"[{request_id}] Bucket appears private, creating signed URL")

        try:
            # 24 hours = 86400 seconds
            expires_in = 86400
            signed_response = client.storage.from_(bucket).create_signed_url(
                file_path, expires_in
            )

            signed_url = signed_response.get("signedURL") or signed_response.get(
                "signedUrl"
            )
            if not signed_url:
                raise SupabaseUploadError("Failed to create signed URL")

            logger.info(f"[{request_id}] Supabase signed URL created: expires_in={expires_in}s")

            return UploadResult(
                url=signed_url,
                path=file_path,
                bucket=bucket,
                bytes=len(audio_bytes),
                signed_url=signed_url,
                expires_in=expires_in,
            )
        except Exception as e:
            if isinstance(e, SupabaseUploadError):
                raise
            logger.error(f"[{request_id}] Failed to create signed URL: {e}")
            raise SupabaseUploadError(f"Failed to create signed URL: {e}")
