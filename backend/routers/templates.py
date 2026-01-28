# -*- coding: utf-8 -*-
"""
BE-STG13-014: Template catalog API endpoints.

Public endpoints (no auth required):
- GET /api/templates - List templates with filtering
- GET /api/templates/{id} - Get single template
"""

import logging
import os
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query, Request, Response
from pydantic import BaseModel

from services.templates import (
    template_service,
    TemplateNotFoundError,
    DEFAULT_LANG,
)
from services.error_response import error_response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/templates", tags=["Templates"])

# Cache control settings
CACHE_MAX_AGE = 3600  # 1 hour


def is_templates_enabled() -> bool:
    """Check if templates feature is enabled."""
    return os.getenv("TEMPLATES_ENABLED", "true").lower() == "true"


def check_templates_enabled(request: Request):
    """
    Check if templates feature is enabled.

    Returns error response if disabled.
    """
    if not is_templates_enabled():
        request_id = getattr(request.state, "request_id", "unknown")
        logger.info(f"[{request_id}] Templates disabled, returning 503")
        return error_response(
            status_code=503,
            code="TEMPLATES_DISABLED",
            message="Template catalog is currently disabled",
            request_id=request_id,
        )
    return None


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
    defaults: TemplateDefaults
    regionPack: Dict[str, TemplateRegionPack]


class TemplateListMeta(BaseModel):
    total: int
    lang: str
    registryVersion: int


class TemplateListResponse(BaseModel):
    data: List[Dict[str, Any]]
    meta: TemplateListMeta


@router.get(
    "",
    response_model=TemplateListResponse,
    responses={
        200: {"description": "Template list"},
        304: {"description": "Not modified (ETag match)"},
        503: {"description": "Templates disabled"},
    },
)
async def list_templates(
    request: Request,
    response: Response,
    tag: Optional[str] = Query(default=None, description="Filter by tag"),
    search: Optional[str] = Query(default=None, description="Search in name/description"),
    lang: str = Query(default=DEFAULT_LANG, description="Language code (en, ko, zh)"),
):
    """
    List available templates with optional filtering.

    Supports:
    - Tag filtering: ?tag=viral
    - Search: ?search=hook
    - Language: ?lang=ko (defaults to 'en')

    Returns cached response with ETag for efficient polling.
    """
    request_id = getattr(request.state, "request_id", "unknown")

    # Check if feature is enabled
    disabled_response = check_templates_enabled(request)
    if disabled_response:
        return disabled_response

    # Check ETag for 304 response
    etag = template_service.etag
    if check_etag_match(request, etag):
        response.status_code = 304
        add_cache_headers(response, etag)
        return Response(status_code=304, headers=dict(response.headers))

    # Get templates
    templates, total = template_service.list_templates(
        tag=tag,
        search=search,
        lang=lang,
    )

    logger.info(
        f"[{request_id}] GET /templates | tag={tag or '-'} search={search or '-'} "
        f"lang={lang} count={total}"
    )

    # Add cache headers
    add_cache_headers(response, etag)

    return {
        "data": templates,
        "meta": {
            "total": total,
            "lang": lang,
            "registryVersion": template_service.registry_version,
        },
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
    lang: str = Query(default=DEFAULT_LANG, description="Language code (en, ko, zh)"),
):
    """
    Get single template by ID.

    Returns full template with localized name/description based on lang parameter.
    """
    request_id = getattr(request.state, "request_id", "unknown")

    # Check if feature is enabled
    disabled_response = check_templates_enabled(request)
    if disabled_response:
        return disabled_response

    # Check ETag for 304 response
    etag = template_service.etag
    if check_etag_match(request, etag):
        response.status_code = 304
        add_cache_headers(response, etag)
        return Response(status_code=304, headers=dict(response.headers))

    try:
        template = template_service.get_template(template_id, lang=lang)

        logger.info(
            f"[{request_id}] GET /templates/{template_id} | lang={lang}"
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
