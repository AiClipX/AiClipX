# -*- coding: utf-8 -*-
"""TTS API router for Azure Text-to-Speech synthesis (BE-AUTH-001: auth required)."""

import logging
from uuid import uuid4

from fastapi import APIRouter, Depends, Request

from models.tts import TTSRequest, TTSResponse
from services.auth import AuthUser, get_current_user
from services.supabase_client import get_user_client
from services.azure_tts import (
    AzureTTSConfigError,
    AzureTTSError,
    synthesize,
)
from services.supabase_storage import (
    SupabaseConfigError,
    SupabaseUploadError,
    upload_audio,
)
from services.ratelimit import limiter, RATE_LIMIT_TTS
from services.error_response import error_response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tts", tags=["TTS"])


@router.post(
    "",
    response_model=TTSResponse,
    status_code=200,
    summary="Generate speech audio from text",
    description="""
Generate an MP3 audio file from text using Azure Text-to-Speech.

You can either:
- Provide `text` and `voice` to auto-generate SSML
- Provide raw `ssml` directly for full control

The generated audio is stored in Supabase storage and a URL is returned.
""",
    responses={
        200: {
            "description": "Audio generated successfully",
            "model": TTSResponse,
        },
        400: {
            "description": "Invalid request (missing text/voice)",
        },
        500: {
            "description": "Configuration error (Azure/Supabase not configured)",
        },
        502: {
            "description": "Azure TTS API error",
        },
        503: {
            "description": "Service temporarily unavailable (rate limited)",
        },
    },
)
@limiter.limit(RATE_LIMIT_TTS)
async def generate_tts(
    request: Request,
    body: TTSRequest,
    user: AuthUser = Depends(get_current_user),
) -> TTSResponse:
    """
    Generate speech audio from text using Azure TTS (BE-AUTH-001: auth required).

    - If `ssml` is provided, it is sent directly to Azure.
    - Otherwise, SSML is generated from `text`, `voice`, and `locale`.
    - Audio is uploaded to Supabase and a URL is returned.
    """
    request_id = getattr(request.state, "request_id", "unknown")

    logger.info(
        f"[{request_id}] TTS request: text_len={len(body.text) if body.text else 0}, "
        f"voice={body.voice}, ssml={'yes' if body.ssml else 'no'}, user={user.id[:8]}..."
    )

    # Step 1: Synthesize audio with Azure TTS
    try:
        tts_result = await synthesize(
            text=body.text,
            voice=body.voice,
            locale=body.locale or "en-US",
            ssml=body.ssml,
            output_format=body.format,
            request_id=request_id,
        )
    except AzureTTSConfigError as e:
        logger.error(f"[{request_id}] Azure config error: {e}")
        return error_response(
            status_code=500,
            code="AZURE_CONFIG_ERROR",
            message=str(e),
            request_id=request_id,
        )
    except AzureTTSError as e:
        logger.error(f"[{request_id}] Azure TTS error: {e}")

        # Map Azure errors to appropriate HTTP status
        if e.status_code in (401, 403):
            return error_response(
                status_code=502,
                code="AZURE_AUTH_ERROR",
                message="Azure authentication failed",
                request_id=request_id,
            )
        elif e.status_code == 429:
            return error_response(
                status_code=503,
                code="AZURE_RATE_LIMITED",
                message=f"Azure TTS rate limited. Retry after {e.retry_after or 'unknown'} seconds.",
                request_id=request_id,
                details={"retryAfter": e.retry_after},
            )
        else:
            return error_response(
                status_code=502,
                code="AZURE_TTS_ERROR",
                message=f"Azure TTS failed: {e}",
                request_id=request_id,
            )

    # Step 2: Upload to Supabase storage
    try:
        upload_result = await upload_audio(
            audio_bytes=tts_result.audio_bytes,
            content_type=tts_result.content_type,
            request_id=request_id,
        )
    except SupabaseConfigError as e:
        logger.error(f"[{request_id}] Supabase config error: {e}")
        return error_response(
            status_code=500,
            code="SUPABASE_CONFIG_ERROR",
            message=str(e),
            request_id=request_id,
        )
    except SupabaseUploadError as e:
        logger.error(f"[{request_id}] Supabase upload error: {e}")
        return error_response(
            status_code=502,
            code="STORAGE_UPLOAD_ERROR",
            message=f"Failed to store audio: {e}",
            request_id=request_id,
        )

    # Step 3: Persist to database (BE-DB-PERSIST-001 + BE-AUTH-001: include user_id)
    tts_record_id = f"tts_{uuid4().hex[:12]}"
    try:
        # BE-AUTH-001: Use user_client for RLS enforcement
        user_client = get_user_client(user.jwt_token)
        user_client.table("tts_requests").insert({
            "id": tts_record_id,
            "user_id": user.id,
            "request_id": request_id,
            "locale": body.locale or "en-US",
            "voice": tts_result.voice,
            "text_len": len(body.text) if body.text else 0,
            "ssml": body.ssml,
            "audio_url": upload_result.url,
            "bytes": upload_result.bytes,
            "format": tts_result.format,
        }).execute()
        logger.info(f"[{request_id}] TTS persisted to DB: id={tts_record_id}, user_id={user.id[:8]}...")
    except Exception as e:
        # Log but don't fail - persistence is secondary to serving the request
        logger.error(f"[{request_id}] Failed to persist TTS to DB: {e}")

    logger.info(
        f"[{request_id}] TTS complete: url={upload_result.url[:80]}..., bytes={upload_result.bytes}"
    )

    return TTSResponse(
        requestId=request_id,
        audioUrl=upload_result.url,
        contentType=tts_result.content_type,
        bytes=upload_result.bytes,
        voice=tts_result.voice,
        format=tts_result.format,
    )
