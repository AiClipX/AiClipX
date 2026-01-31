# -*- coding: utf-8 -*-
"""
BE-STG13-014 + BE-STG13-022: Template catalog API endpoints.

Public endpoints (no auth required):
- GET /api/templates - List templates with filtering and pagination
- GET /api/templates/{id} - Get single template

BE-STG13-022 Contract:
- Query params: locale, tag, q, limit, cursor
- Response: { data: [...], nextCursor: "..." }
- Error: { code, message, requestId }
- Degradation: Empty list (200) when unavailable
"""

import logging
import os
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query, Request, Response
from pydantic import BaseModel

from services.templates import (
    template_service,
    TemplateNotFoundError,
    DEFAULT_LOCALE,
    DEFAULT_LIMIT,
    MAX_LIMIT,
)
from services.error_response import error_response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/templates", tags=["Templates"])

# Cache control settings
CACHE_MAX_AGE = 3600  # 1 hour


def is_templates_enabled() -> bool:
    """Check if templates feature is enabled."""
    return os.getenv("TEMPLATES_ENABLED", "true").lower() == "true"


def add_cache_headers(response: Response, etag: str) -> None:
    """Add caching headers to response."""
    response.headers["ETag"] = f'"{etag}"'
    response.headers["Cache-Control"] = f"public, max-age={CACHE_MAX_AGE}"


def check_etag_match(request: Request, etag: str) -> bool:
    """Check if client ETag matches (for 304 response)."""
    client_etag = request.headers.get("If-None-Match", "")
    # Strip quotes if present
    client_etag = client_etag.strip('"')
    return client_etag == etag


# Response Models
class TemplateDefaults(BaseModel):
    title: str
    prompt: str
    params: Dict[str, Any]


class TemplateRegionPack(BaseModel):
    name: str
    description: str


class TemplateResponse(BaseModel):
    id: str
    version: int
    name: str
    description: str
    tags: List[str]
    enabled: bool
    recommendedUseCase: Optional[str] = None
    defaults: TemplateDefaults
    regionPack: Dict[str, TemplateRegionPack]


class TemplateListResponse(BaseModel):
    """BE-STG13-022: Paginated template list."""
    data: List[Dict[str, Any]]
    nextCursor: Optional[str] = None


@router.get(
    "",
    response_model=TemplateListResponse,
    responses={
        200: {"description": "Template list (empty if disabled)"},
        304: {"description": "Not modified (ETag match)"},
    },
)
async def list_templates(
    request: Request,
    response: Response,
    locale: str = Query(
        default=DEFAULT_LOCALE,
        description="Language code (en, ko, zh)"
    ),
    tag: Optional[str] = Query(
        default=None,
        description="Filter by tag"
    ),
    q: Optional[str] = Query(
        default=None,
        description="Search in name/description"
    ),
    limit: int = Query(
        default=DEFAULT_LIMIT,
        ge=1,
        le=MAX_LIMIT,
        description="Results per page"
    ),
    cursor: Optional[str] = Query(
        default=None,
        description="Pagination cursor"
    ),
):
    """
    List available templates with optional filtering and pagination.

    BE-STG13-022 Contract:
    - Response: { data: [...], nextCursor: "..." }
    - Degradation: Returns empty list if templates disabled

    Supports:
    - Tag filtering: ?tag=viral
    - Search: ?q=hook
    - Language: ?locale=ko (defaults to 'en')
    - Pagination: ?limit=10&cursor=xxx
    """
    request_id = getattr(request.state, "request_id", "unknown")

    # BE-STG13-022: Degradation - return empty list if disabled
    if not is_templates_enabled():
        logger.info(f"[{request_id}] Templates disabled, returning empty list")
        return {"data": [], "nextCursor": None}

    # Check ETag for 304 response
    etag = template_service.etag
    if check_etag_match(request, etag):
        response.status_code = 304
        add_cache_headers(response, etag)
        return Response(status_code=304, headers=dict(response.headers))

    # Get templates with pagination
    templates, next_cursor = template_service.list_templates(
        tag=tag,
        q=q,
        locale=locale,
        limit=limit,
        cursor=cursor,
    )

    logger.info(
        f"[{request_id}] GET /templates | locale={locale} tag={tag or '-'} "
        f"q={q or '-'} limit={limit} cursor={cursor[:8] + '...' if cursor else '-'} "
        f"count={len(templates)} hasMore={next_cursor is not None}"
    )

    # Add cache headers
    add_cache_headers(response, etag)

    return {
        "data": templates,
        "nextCursor": next_cursor,
    }


@router.get(
    "/{template_id}",
    response_model=TemplateResponse,
    responses={
        200: {"description": "Template details"},
        304: {"description": "Not modified (ETag match)"},
        404: {"description": "Template not found"},
        503: {"description": "Templates disabled"},
    },
)
async def get_template(
    request: Request,
    response: Response,
    template_id: str,
    locale: str = Query(
        default=DEFAULT_LOCALE,
        description="Language code (en, ko, zh)"
    ),
):
    """
    Get single template by ID.

    BE-STG13-022 Contract:
    - Response: Template object with all fields
    - Error: { code, message, requestId }

    Returns full template with localized name/description based on locale parameter.
    """
    request_id = getattr(request.state, "request_id", "unknown")

    # Check if feature is enabled
    if not is_templates_enabled():
        logger.info(f"[{request_id}] Templates disabled, returning 503")
        return error_response(
            status_code=503,
            code="TEMPLATES_DISABLED",
            message="Template catalog is currently disabled",
            request_id=request_id,
        )

    # Check ETag for 304 response
    etag = template_service.etag
    if check_etag_match(request, etag):
        response.status_code = 304
        add_cache_headers(response, etag)
        return Response(status_code=304, headers=dict(response.headers))

    try:
        template = template_service.get_template(template_id, locale=locale)

        logger.info(
            f"[{request_id}] GET /templates/{template_id} | locale={locale}"
        )

        # Add cache headers
        add_cache_headers(response, etag)

        return template

    except TemplateNotFoundError:
        logger.warning(f"[{request_id}] Template not found: {template_id}")
        return error_response(
            status_code=404,
            code="TEMPLATE_NOT_FOUND",
            message=f"Template '{template_id}' not found",
            request_id=request_id,
        )
