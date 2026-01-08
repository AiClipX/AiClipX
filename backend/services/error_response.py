# -*- coding: utf-8 -*-
"""
Unified error response helper for consistent API error formatting.

All API errors should use this helper to ensure consistent error schema:
{
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "requestId": "req_xxx",
    "details": {}
}
"""

from typing import Any, Dict, Optional

from fastapi.responses import JSONResponse


def error_response(
    status_code: int,
    code: str,
    message: str,
    request_id: str,
    details: Optional[Dict[str, Any]] = None,
) -> JSONResponse:
    """
    Create unified error response with consistent schema.

    Args:
        status_code: HTTP status code (400, 404, 409, 422, 500, etc.)
        code: Error code constant (e.g., "NOT_FOUND", "VALIDATION_ERROR")
        message: Human-readable error message
        request_id: Request ID for tracing
        details: Optional additional error details

    Returns:
        JSONResponse with standardized error format
    """
    return JSONResponse(
        status_code=status_code,
        content={
            "code": code,
            "message": message,
            "requestId": request_id,
            "details": details or {},
        },
        headers={"X-Request-Id": request_id},
    )
