# -*- coding: utf-8 -*-
"""
BE-STG13-013: User Assets Router.

Endpoints for user asset uploads via signed URLs:
- POST /api/upload-urls - Get signed upload URL
- POST /api/assets/{id}/commit - Confirm upload completed
- GET /api/assets - List user's assets
- GET /api/assets/{id}/url - Get fresh download URL
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field

from services.auth import get_current_user, AuthUser
from services.error_response import error_response
from services.user_assets import (
    create_upload_url,
    commit_asset,
    list_user_assets,
    get_asset_download_url,
    InvalidFileTypeError,
    FileTooLargeError,
    AssetNotFoundError,
    AssetNotPendingError,
    UserAssetError,
    ALLOWED_TYPES,
)
from services.audit import audit_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Assets"])


def get_client_ip(request: Request) -> str:
    """Extract client IP from request (handles proxies)."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# Request/Response Models
class UploadUrlRequest(BaseModel):
    """Request body for generating upload URL."""
    filename: str = Field(..., min_length=1, max_length=255, description="Original filename")
    mimeType: str = Field(..., description="MIME type of file")
    sizeBytes: int = Field(..., gt=0, description="File size in bytes")
    taskId: Optional[str] = Field(None, description="Optional task ID to link asset to")


class UploadUrlResponse(BaseModel):
    """Response with signed upload URL."""
    assetId: str
    uploadUrl: str
    expiresAt: str


class AssetResponse(BaseModel):
    """Asset information response."""
    id: str
    filename: str
    mimeType: str
    sizeBytes: int
    status: str
    url: Optional[str] = None
    urlExpiresAt: Optional[str] = None
    taskId: Optional[str] = None
    createdAt: Optional[str] = None


class AssetListResponse(BaseModel):
    """Paginated asset list response."""
    data: list[AssetResponse]
    nextCursor: Optional[str] = None


class AllowedTypesResponse(BaseModel):
    """Response listing allowed file types."""
    types: dict[str, int]  # mime_type -> max_size_bytes


@router.get("/upload-types", response_model=AllowedTypesResponse)
async def get_allowed_types():
    """
    Get list of allowed file types and their size limits.

    Returns map of MIME type to max size in bytes.
    """
    return {"types": ALLOWED_TYPES}


@router.post(
    "/upload-urls",
    response_model=UploadUrlResponse,
    responses={
        200: {"description": "Upload URL generated"},
        400: {"description": "Invalid file type or size"},
        401: {"description": "Not authenticated"},
    },
)
async def create_upload_url_endpoint(
    request: Request,
    body: UploadUrlRequest,
    user: AuthUser = Depends(get_current_user),
):
    """
    Generate a signed URL for direct upload to storage.

    Flow:
    1. Call this endpoint to get upload URL
    2. PUT file to uploadUrl (direct to Supabase Storage)
    3. Call POST /api/assets/{assetId}/commit to confirm

    Upload URL expires in 15 minutes.
    """
    request_id = getattr(request.state, "request_id", "unknown")

    logger.info(
        f"[{request_id}] POST /upload-urls | user={user.id[:8]}... "
        f"filename={body.filename} type={body.mimeType} size={body.sizeBytes}"
    )

    try:
        result = await create_upload_url(
            user_id=user.id,
            filename=body.filename,
            mime_type=body.mimeType,
            size_bytes=body.sizeBytes,
            task_id=body.taskId,
            request_id=request_id,
        )

        # Audit log
        audit_service.emit(
            action="asset.upload_url_created",
            entity_type="asset",
            entity_id=result.asset_id,
            actor_user_id=user.id,
            request_id=request_id,
            ip=get_client_ip(request),
            user_agent=request.headers.get("User-Agent"),
            meta={
                "filename": body.filename,
                "mimeType": body.mimeType,
                "sizeBytes": body.sizeBytes,
                "taskId": body.taskId,
            },
        )

        return UploadUrlResponse(
            assetId=result.asset_id,
            uploadUrl=result.upload_url,
            expiresAt=result.expires_at,
        )

    except InvalidFileTypeError as e:
        logger.warning(f"[{request_id}] Invalid file type: {e}")
        return error_response(
            status_code=400,
            code="INVALID_FILE_TYPE",
            message=str(e),
            request_id=request_id,
        )

    except FileTooLargeError as e:
        logger.warning(f"[{request_id}] File too large: {e}")
        return error_response(
            status_code=400,
            code="FILE_TOO_LARGE",
            message=str(e),
            request_id=request_id,
        )

    except UserAssetError as e:
        logger.error(f"[{request_id}] Asset error: {e}")
        return error_response(
            status_code=500,
            code="UPLOAD_URL_ERROR",
            message="Failed to generate upload URL",
            request_id=request_id,
        )


@router.post(
    "/assets/{asset_id}/commit",
    response_model=AssetResponse,
    responses={
        200: {"description": "Asset committed successfully"},
        400: {"description": "Asset not in pending status"},
        401: {"description": "Not authenticated"},
        404: {"description": "Asset not found"},
    },
)
async def commit_asset_endpoint(
    request: Request,
    asset_id: str,
    user: AuthUser = Depends(get_current_user),
):
    """
    Confirm that upload is complete and get signed download URL.

    Call this after successfully uploading file to the uploadUrl.
    Returns asset info with a fresh signed download URL.
    """
    request_id = getattr(request.state, "request_id", "unknown")

    logger.info(
        f"[{request_id}] POST /assets/{asset_id[:8]}../commit | user={user.id[:8]}..."
    )

    try:
        result = await commit_asset(
            asset_id=asset_id,
            user_id=user.id,
            request_id=request_id,
        )

        # Audit log
        audit_service.emit(
            action="asset.committed",
            entity_type="asset",
            entity_id=asset_id,
            actor_user_id=user.id,
            request_id=request_id,
            ip=get_client_ip(request),
            user_agent=request.headers.get("User-Agent"),
            meta={
                "filename": result.filename,
                "mimeType": result.mime_type,
                "sizeBytes": result.size_bytes,
            },
        )

        return AssetResponse(
            id=result.id,
            filename=result.filename,
            mimeType=result.mime_type,
            sizeBytes=result.size_bytes,
            status=result.status,
            url=result.url,
            urlExpiresAt=result.url_expires_at,
            taskId=result.task_id,
            createdAt=result.created_at,
        )

    except AssetNotFoundError:
        logger.warning(f"[{request_id}] Asset not found: {asset_id}")
        return error_response(
            status_code=404,
            code="ASSET_NOT_FOUND",
            message=f"Asset {asset_id} not found",
            request_id=request_id,
        )

    except AssetNotPendingError as e:
        logger.warning(f"[{request_id}] Asset not pending: {e}")
        return error_response(
            status_code=400,
            code="ASSET_NOT_PENDING",
            message=str(e),
            request_id=request_id,
        )

    except UserAssetError as e:
        logger.error(f"[{request_id}] Commit error: {e}")
        return error_response(
            status_code=500,
            code="COMMIT_ERROR",
            message="Failed to commit asset",
            request_id=request_id,
        )


@router.get(
    "/assets",
    response_model=AssetListResponse,
    responses={
        200: {"description": "Asset list"},
        401: {"description": "Not authenticated"},
    },
)
async def list_assets_endpoint(
    request: Request,
    user: AuthUser = Depends(get_current_user),
    limit: int = Query(default=20, ge=1, le=100, description="Results per page"),
    cursor: Optional[str] = Query(default=None, description="Pagination cursor"),
    taskId: Optional[str] = Query(default=None, description="Filter by task ID"),
):
    """
    List user's committed assets with pagination.

    Returns assets sorted by creation date (newest first).
    Use nextCursor for pagination.
    """
    request_id = getattr(request.state, "request_id", "unknown")

    logger.info(
        f"[{request_id}] GET /assets | user={user.id[:8]}... limit={limit} "
        f"cursor={cursor[:8] + '...' if cursor else '-'} taskId={taskId or '-'}"
    )

    try:
        assets, next_cursor = await list_user_assets(
            user_id=user.id,
            limit=limit,
            cursor=cursor,
            task_id=taskId,
            request_id=request_id,
        )

        return AssetListResponse(
            data=[
                AssetResponse(
                    id=a.id,
                    filename=a.filename,
                    mimeType=a.mime_type,
                    sizeBytes=a.size_bytes,
                    status=a.status,
                    url=a.url,
                    urlExpiresAt=a.url_expires_at,
                    taskId=a.task_id,
                    createdAt=a.created_at,
                )
                for a in assets
            ],
            nextCursor=next_cursor,
        )

    except UserAssetError as e:
        logger.error(f"[{request_id}] List error: {e}")
        return error_response(
            status_code=500,
            code="LIST_ERROR",
            message="Failed to list assets",
            request_id=request_id,
        )


@router.get(
    "/assets/{asset_id}/url",
    response_model=AssetResponse,
    responses={
        200: {"description": "Fresh download URL"},
        401: {"description": "Not authenticated"},
        404: {"description": "Asset not found"},
    },
)
async def get_asset_url_endpoint(
    request: Request,
    asset_id: str,
    user: AuthUser = Depends(get_current_user),
):
    """
    Get a fresh signed download URL for an existing asset.

    Use this when the previous URL has expired.
    """
    request_id = getattr(request.state, "request_id", "unknown")

    logger.info(
        f"[{request_id}] GET /assets/{asset_id[:8]}../url | user={user.id[:8]}..."
    )

    try:
        result = await get_asset_download_url(
            asset_id=asset_id,
            user_id=user.id,
            request_id=request_id,
        )

        return AssetResponse(
            id=result.id,
            filename=result.filename,
            mimeType=result.mime_type,
            sizeBytes=result.size_bytes,
            status=result.status,
            url=result.url,
            urlExpiresAt=result.url_expires_at,
            taskId=result.task_id,
            createdAt=result.created_at,
        )

    except AssetNotFoundError:
        logger.warning(f"[{request_id}] Asset not found: {asset_id}")
        return error_response(
            status_code=404,
            code="ASSET_NOT_FOUND",
            message=f"Asset {asset_id} not found",
            request_id=request_id,
        )

    except UserAssetError as e:
        logger.error(f"[{request_id}] URL error: {e}")
        return error_response(
            status_code=500,
            code="URL_ERROR",
            message="Failed to generate download URL",
            request_id=request_id,
        )
