# -*- coding: utf-8 -*-
"""Azure TTS service for generating speech from text using Azure Cognitive Services."""

import logging
import os
import time
from dataclasses import dataclass
from html import escape as html_escape
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


class AzureTTSConfigError(Exception):
    """Raised when Azure TTS configuration is missing or invalid."""

    pass


class AzureTTSError(Exception):
    """Raised when Azure TTS API returns an error."""

    def __init__(
        self,
        message: str,
        status_code: int,
        retry_after: Optional[int] = None,
    ):
        super().__init__(message)
        self.status_code = status_code
        self.retry_after = retry_after


@dataclass
class TTSResult:
    """Result from Azure TTS synthesis."""

    audio_bytes: bytes
    content_type: str
    voice: str
    format: str
    duration_ms: int


def get_azure_endpoint() -> str:
    """
    Resolve Azure TTS endpoint from environment variables.

    Priority:
    1. AZURE_SPEECH_ENDPOINT (direct URL)
    2. AZURE_SPEECH_REGION (construct URL)
    3. Raise AzureTTSConfigError

    Returns:
        str: Azure TTS endpoint URL

    Raises:
        AzureTTSConfigError: If neither endpoint nor region is configured
    """
    endpoint = os.getenv("AZURE_SPEECH_ENDPOINT", "").strip()
    if endpoint:
        return endpoint

    region = os.getenv("AZURE_SPEECH_REGION", "").strip()
    if region:
        return f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1"

    raise AzureTTSConfigError(
        "Azure TTS not configured: set AZURE_SPEECH_ENDPOINT or AZURE_SPEECH_REGION"
    )


def get_azure_key() -> str:
    """
    Get Azure Speech API key from environment.

    Returns:
        str: Azure Speech API key

    Raises:
        AzureTTSConfigError: If key is not configured
    """
    key = os.getenv("AZURE_SPEECH_KEY", "").strip()
    if not key:
        raise AzureTTSConfigError("Azure TTS not configured: AZURE_SPEECH_KEY is missing")
    return key


def get_default_format() -> str:
    """Get default audio output format from environment."""
    return os.getenv("AZURE_TTS_OUTPUT_FORMAT", "audio-24khz-48kbitrate-mono-mp3").strip()


def build_ssml(text: str, voice: str, locale: str) -> str:
    """
    Build SSML from plain text, voice, and locale.

    Args:
        text: Plain text to synthesize
        voice: Azure voice name (e.g., "en-US-JennyNeural")
        locale: Language locale (e.g., "en-US")

    Returns:
        str: Valid SSML document
    """
    # Escape XML special characters to prevent injection
    escaped_text = html_escape(text, quote=True)

    return f'''<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="{locale}">
    <voice name="{voice}">{escaped_text}</voice>
</speak>'''


async def synthesize(
    text: Optional[str] = None,
    voice: Optional[str] = None,
    locale: str = "en-US",
    ssml: Optional[str] = None,
    output_format: Optional[str] = None,
    request_id: str = "unknown",
) -> TTSResult:
    """
    Synthesize speech using Azure TTS.

    Args:
        text: Plain text to synthesize (ignored if ssml provided)
        voice: Azure voice name (required if using text)
        locale: Language locale for SSML
        ssml: Raw SSML to send directly to Azure
        output_format: Audio format (defaults to AZURE_TTS_OUTPUT_FORMAT)
        request_id: Request ID for logging

    Returns:
        TTSResult: Audio bytes and metadata

    Raises:
        AzureTTSConfigError: If Azure is not properly configured
        AzureTTSError: If Azure API returns an error
    """
    start_time = time.time()

    # Resolve configuration
    endpoint = get_azure_endpoint()
    api_key = get_azure_key()
    audio_format = output_format or get_default_format()

    # Build SSML if not provided
    if ssml:
        request_body = ssml
        # Extract voice from SSML for response (best effort)
        used_voice = voice or "custom-ssml"
    else:
        if not text or not voice:
            raise ValueError("text and voice are required when ssml is not provided")
        request_body = build_ssml(text, voice, locale)
        used_voice = voice

    # Log request (no secrets!)
    endpoint_host = endpoint.split("//")[-1].split("/")[0]
    logger.info(
        f"[{request_id}] Azure TTS request: endpoint={endpoint_host}, voice={used_voice}, format={audio_format}"
    )

    # Make request to Azure
    headers = {
        "Ocp-Apim-Subscription-Key": api_key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": audio_format,
        "User-Agent": "AiClipX-TTS/1.0",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                endpoint,
                content=request_body.encode("utf-8"),
                headers=headers,
            )
        except httpx.TimeoutException:
            raise AzureTTSError("Azure TTS request timed out", status_code=504)
        except httpx.RequestError as e:
            raise AzureTTSError(f"Azure TTS request failed: {e}", status_code=502)

    duration_ms = int((time.time() - start_time) * 1000)

    # Handle errors
    if response.status_code == 401 or response.status_code == 403:
        logger.error(f"[{request_id}] Azure auth failed: {response.status_code}")
        raise AzureTTSError("Azure authentication failed", status_code=response.status_code)

    if response.status_code == 429:
        retry_after = response.headers.get("Retry-After")
        retry_hint = int(retry_after) if retry_after and retry_after.isdigit() else None
        logger.warning(f"[{request_id}] Azure rate limited, retry-after={retry_after}")
        raise AzureTTSError(
            "Azure TTS rate limited",
            status_code=429,
            retry_after=retry_hint,
        )

    if response.status_code >= 400:
        logger.error(
            f"[{request_id}] Azure TTS error: {response.status_code} - {response.text[:200]}"
        )
        raise AzureTTSError(
            f"Azure TTS failed with status {response.status_code}",
            status_code=response.status_code,
        )

    audio_bytes = response.content
    content_length = len(audio_bytes)

    logger.info(
        f"[{request_id}] Azure TTS success: {content_length} bytes, {duration_ms}ms"
    )

    return TTSResult(
        audio_bytes=audio_bytes,
        content_type="audio/mpeg",
        voice=used_voice,
        format=audio_format,
        duration_ms=duration_ms,
    )
