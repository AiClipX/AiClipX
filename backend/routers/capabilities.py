# -*- coding: utf-8 -*-
"""
BE-STG13-009: Capabilities API Router.

Public endpoint for FE to check platform capabilities before/after login.
"""
import logging
from typing import Any, Dict

from fastapi import APIRouter, Request

from services.capabilities import capability_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/capabilities", tags=["Capabilities"])


@router.get(
    "",
    response_model=Dict[str, Any],
    summary="Get platform capabilities",
    description="Returns current platform capabilities and limits. Public endpoint (no auth required).",
    responses={
        200: {
            "description": "Platform capabilities",
            "content": {
                "application/json": {
                    "example": {
                        "apiVersion": 1,
                        "features": {
                            "authRequired": True,
                            "engineRunwayEnabled": True,
                            "engineMockEnabled": True,
                            "signedUrlEnabled": True,
                            "cancelEnabled": True,
                        },
                        "limits": {
                            "maxActiveTasksPerUser": 3,
                            "maxTitleLength": 500,
                            "maxPromptLength": 2000,
                        },
                    }
                }
            },
        }
    },
)
async def get_capabilities(request: Request) -> Dict[str, Any]:
    """
    Get platform capabilities (BE-STG13-009).

    **Public endpoint** - no authentication required.

    Returns:
    - **apiVersion**: Current API version (integer)
    - **features**: Boolean flags for available features
    - **limits**: Numeric limits for various resources

    Use this endpoint to:
    - Check feature availability before showing UI elements
    - Adapt UI based on current deployment configuration
    - Handle graceful degradation when features are disabled
    """
    request_id = getattr(request.state, "request_id", "unknown")
    logger.info(f"[{request_id}] GET /api/capabilities")

    return capability_service.get_all()
