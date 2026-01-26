# -*- coding: utf-8 -*-
"""
BE-STG13-009: Capability flags service.

Provides runtime capability detection based on environment configuration.
Used by /api/capabilities endpoint and feature degradation checks.
"""
import os
from typing import Dict, Any

from services.ratelimit import MAX_CONCURRENT_TASKS_PER_USER


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
        """Whether Runway engine is available (requires API key)."""
        runway_key = os.getenv("RUNWAY_API_KEY", "")
        return bool(runway_key and runway_key.strip())

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
    def max_active_tasks_per_user(self) -> int:
        """Maximum concurrent tasks per user."""
        return MAX_CONCURRENT_TASKS_PER_USER

    @property
    def max_title_length(self) -> int:
        """Maximum title length for video tasks."""
        return 500

    @property
    def max_prompt_length(self) -> int:
        """Maximum prompt length for video tasks."""
        return 2000

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
            },
            "limits": {
                "maxActiveTasksPerUser": self.max_active_tasks_per_user,
                "maxTitleLength": self.max_title_length,
                "maxPromptLength": self.max_prompt_length,
            },
        }


# Singleton instance
capability_service = CapabilityService()
