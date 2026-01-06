# -*- coding: utf-8 -*-
"""TTS API router for Azure Text-to-Speech synthesis."""

import logging
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request

from database import database
from models.tts import TTSRequest, TTSResponse
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
async def generate_tts(request: Request, body: TTSRequest) -> TTSResponse:
    """
    Generate speech audio from text using Azure TTS.

    - If `ssml` is provided, it is sent directly to Azure.
    - Otherwise, SSML is generated from `text`, `voice`, and `locale`.
    - Audio is uploaded to Supabase and a URL is returned.
    """
    request_id = getattr(request.state, "request_id", "unknown")

    logger.info(
        f"[{request_id}] TTS request: text_len={len(body.text) if body.text else 0}, "
        f"voice={body.voice}, ssml={'yes' if body.ssml else 'no'}"
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
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )
    except AzureTTSError as e:
        logger.error(f"[{request_id}] Azure TTS error: {e}")

        # Map Azure errors to appropriate HTTP status
        if e.status_code in (401, 403):
            raise HTTPException(
                status_code=502,
                detail="Azure authentication failed",
            )
        elif e.status_code == 429:
            headers = {}
            if e.retry_after:
                headers["Retry-After"] = str(e.retry_after)
            raise HTTPException(
                status_code=503,
                detail=f"Azure TTS rate limited. Retry after {e.retry_after or 'unknown'} seconds.",
            )
        else:
            raise HTTPException(
                status_code=502,
                detail=f"Azure TTS failed: {e}",
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
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )
    except SupabaseUploadError as e:
        logger.error(f"[{request_id}] Supabase upload error: {e}")
        raise HTTPException(
            status_code=502,
            detail=f"Failed to store audio: {e}",
        )

    # Step 3: Persist to database (BE-DB-PERSIST-001)
    tts_record_id = f"tts_{uuid4().hex[:12]}"
    try:
        await database.execute(
            """
            INSERT INTO tts_requests (id, request_id, locale, voice, text_len, ssml, audio_url, bytes, format)
            VALUES (:id, :request_id, :locale, :voice, :text_len, :ssml, :audio_url, :bytes, :format)
            """,
            {
                "id": tts_record_id,
                "request_id": request_id,
                "locale": body.locale or "en-US",
                "voice": tts_result.voice,
                "text_len": len(body.text) if body.text else 0,
                "ssml": body.ssml,
                "audio_url": upload_result.url,
                "bytes": upload_result.bytes,
                "format": tts_result.format,
            },
        )
        logger.info(f"[{request_id}] TTS persisted to DB: id={tts_record_id}")
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
