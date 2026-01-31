# -*- coding: utf-8 -*-
"""
BE-STG13-009: Capability flags service.

Provides runtime capability detection based on environment configuration.
Used by /api/capabilities endpoint and feature degradation checks.

BE-STG13-017: Added circuit breaker status integration.
"""
import os
from typing import Dict, Any

from services.ratelimit import MAX_CONCURRENT_TASKS_PER_USER
from services.quota import (
    MAX_TASKS_PER_DAY_PER_USER,
    MAX_ASSET_UPLOAD_COUNT,
    MAX_ASSET_TOTAL_BYTES,
    QUOTA_ENFORCED,
    ASSET_UPLOAD_ENABLED,
)


# API Version - increment on breaking changes
API_VERSION = 1


class CapabilityService:
    """Service for checking platform capabilities based on config/env."""

    @property
    def api_version(self) -> int:
        return API_VERSION

    @property
    def auth_required(self) -> bool:
        """Whether authentication is required for protected endpoints."""
        return True  # Always true in current implementation

    @property
    def engine_runway_enabled(self) -> bool:
        """
        Whether Runway engine is available.

        BE-STG13-017: Also checks circuit breaker status.
        Returns False if:
        - No RUNWAY_API_KEY configured
        - Circuit breaker is OPEN (too many failures)
        """
        runway_key = os.getenv("RUNWAY_API_KEY", "")
        has_key = bool(runway_key and runway_key.strip())

        if not has_key:
            return False

        # BE-STG13-017: Check circuit breaker
        from services.resilience import runway_circuit_breaker
        if runway_circuit_breaker.is_open():
            return False

        return True

    @property
    def runway_circuit_status(self) -> dict:
        """BE-STG13-017: Get Runway circuit breaker status."""
        from services.resilience import runway_circuit_breaker
        return runway_circuit_breaker.get_status()

    @property
    def engine_mock_enabled(self) -> bool:
        """Whether mock engine is available (for dev/testing)."""
        return os.getenv("ENABLE_MOCK_ENGINE", "true").lower() == "true"

    @property
    def signed_url_enabled(self) -> bool:
        """Whether signed URLs are used for video delivery."""
        return True  # Always true since BE-STG13-003

    @property
    def cancel_enabled(self) -> bool:
        """Whether task cancellation is available."""
        return True  # Always true since BE-STG13-008

    @property
    def templates_enabled(self) -> bool:
        """Whether template catalog is available."""
        return os.getenv("TEMPLATES_ENABLED", "true").lower() == "true"

    @property
    def sse_events_enabled(self) -> bool:
        """Whether SSE real-time events are available."""
        return os.getenv("SSE_EVENTS_ENABLED", "true").lower() == "true"

    @property
    def quota_enforced(self) -> bool:
        """BE-STG13-021: Whether quota enforcement is enabled."""
        return QUOTA_ENFORCED

    @property
    def asset_upload_enabled(self) -> bool:
        """BE-STG13-021: Whether asset upload is enabled."""
        return ASSET_UPLOAD_ENABLED

    @property
    def max_active_tasks_per_user(self) -> int:
        """Maximum concurrent tasks per user."""
        return MAX_CONCURRENT_TASKS_PER_USER

    @property
    def max_tasks_per_day(self) -> int:
        """BE-STG13-018: Maximum tasks per user per day."""
        return MAX_TASKS_PER_DAY_PER_USER

    @property
    def max_title_length(self) -> int:
        """Maximum title length for video tasks."""
        return 500

    @property
    def max_prompt_length(self) -> int:
        """Maximum prompt length for video tasks."""
        return 2000

    @property
    def max_asset_uploads(self) -> int:
        """BE-STG13-021: Maximum asset uploads per user."""
        return MAX_ASSET_UPLOAD_COUNT

    @property
    def max_asset_total_bytes(self) -> int:
        """BE-STG13-021: Maximum total asset storage per user (bytes)."""
        return MAX_ASSET_TOTAL_BYTES

    def get_all(self) -> Dict[str, Any]:
        """Get all capability flags as a dictionary."""
        return {
            "apiVersion": self.api_version,
            "features": {
                "authRequired": self.auth_required,
                "engineRunwayEnabled": self.engine_runway_enabled,
                "engineMockEnabled": self.engine_mock_enabled,
                "signedUrlEnabled": self.signed_url_enabled,
                "cancelEnabled": self.cancel_enabled,
                "templatesEnabled": self.templates_enabled,
                "sseEventsEnabled": self.sse_events_enabled,
                "quotaEnforced": self.quota_enforced,  # BE-STG13-021
                "assetUploadEnabled": self.asset_upload_enabled,  # BE-STG13-021
            },
            "limits": {
                "maxActiveTasksPerUser": self.max_active_tasks_per_user,
                "maxTasksPerDay": self.max_tasks_per_day,  # BE-STG13-018
                "maxAssetUploads": self.max_asset_uploads,  # BE-STG13-021
                "maxAssetTotalBytes": self.max_asset_total_bytes,  # BE-STG13-021
                "maxTitleLength": self.max_title_length,
                "maxPromptLength": self.max_prompt_length,
            },
            # BE-STG13-017: Circuit breaker status
            "circuitBreakers": {
                "runway": self.runway_circuit_status,
            },
        }


# Singleton instance
capability_service = CapabilityService()
