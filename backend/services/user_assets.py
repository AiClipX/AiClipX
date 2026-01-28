# -*- coding: utf-8 -*-
"""
BE-STG13-013: User Assets Service.

Handles user asset uploads via signed URLs:
1. Generate signed upload URL
2. User uploads directly to Supabase Storage
3. Commit confirms upload and returns signed download URL
"""

import logging
import os
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple, List
from uuid import uuid4

from services.supabase_client import get_service_client

logger = logging.getLogger(__name__)

# Configuration
USER_ASSETS_BUCKET = os.getenv("SUPABASE_USER_ASSETS_BUCKET", "user-assets")
UPLOAD_URL_EXPIRY_SECONDS = int(os.getenv("UPLOAD_URL_EXPIRY_SECONDS", "900"))  # 15 minutes
DOWNLOAD_URL_EXPIRY_SECONDS = int(os.getenv("DOWNLOAD_URL_EXPIRY_SECONDS", "86400"))  # 24 hours
ORPHAN_CLEANUP_HOURS = int(os.getenv("ORPHAN_CLEANUP_HOURS", "24"))  # 24 hours

# Allowed file types with max sizes
ALLOWED_TYPES = {
    # Images - max 10 MB
    "image/jpeg": 10 * 1024 * 1024,
    "image/png": 10 * 1024 * 1024,
    "image/webp": 10 * 1024 * 1024,
    "image/gif": 10 * 1024 * 1024,
    # Audio - max 50 MB
    "audio/mpeg": 50 * 1024 * 1024,
    "audio/wav": 50 * 1024 * 1024,
    "audio/mp4": 50 * 1024 * 1024,
    "audio/x-m4a": 50 * 1024 * 1024,
    # Video - max 500 MB
    "video/mp4": 500 * 1024 * 1024,
    "video/webm": 500 * 1024 * 1024,
    "video/quicktime": 500 * 1024 * 1024,
}


class UserAssetError(Exception):
    """Base exception for user asset operations."""
    pass


class InvalidFileTypeError(UserAssetError):
    """Raised when file type is not allowed."""
    pass


class FileTooLargeError(UserAssetError):
    """Raised when file exceeds size limit."""
    pass


class AssetNotFoundError(UserAssetError):
    """Raised when asset is not found."""
    pass


class AssetNotPendingError(UserAssetError):
    """Raised when trying to commit non-pending asset."""
    pass


@dataclass
class UploadUrlResult:
    """Result from generating upload URL."""
    asset_id: str
    upload_url: str
    expires_at: str  # ISO format


@dataclass
class AssetInfo:
    """Asset information."""
    id: str
    filename: str
    mime_type: str
    size_bytes: int
    status: str
    url: Optional[str] = None
    url_expires_at: Optional[str] = None
    task_id: Optional[str] = None
    created_at: Optional[str] = None


def get_file_extension(mime_type: str) -> str:
    """Get file extension from MIME type."""
    ext_map = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
        "audio/mpeg": "mp3",
        "audio/wav": "wav",
        "audio/mp4": "m4a",
        "audio/x-m4a": "m4a",
        "video/mp4": "mp4",
        "video/webm": "webm",
        "video/quicktime": "mov",
    }
    return ext_map.get(mime_type, "bin")


def generate_storage_path(user_id: str, asset_id: str, mime_type: str) -> str:
    """
    Generate storage path for user asset.

    Format: {user_id}/{yyyyMMdd}/{asset_id}.{ext}
    """
    date_folder = datetime.now(timezone.utc).strftime("%Y%m%d")
    ext = get_file_extension(mime_type)
    return f"{user_id}/{date_folder}/{asset_id}.{ext}"


async def create_upload_url(
    user_id: str,
    filename: str,
    mime_type: str,
    size_bytes: int,
    task_id: Optional[str] = None,
    request_id: str = "unknown",
) -> UploadUrlResult:
    """
    Create a signed upload URL for user to upload directly to storage.

    Args:
        user_id: User's ID
        filename: Original filename
        mime_type: MIME type of file
        size_bytes: Expected file size
        task_id: Optional task to link asset to
        request_id: Request ID for logging

    Returns:
        UploadUrlResult with asset_id and upload_url

    Raises:
        InvalidFileTypeError: If mime_type not allowed
        FileTooLargeError: If size exceeds limit for type
    """
    # Validate file type
    if mime_type not in ALLOWED_TYPES:
        raise InvalidFileTypeError(
            f"File type '{mime_type}' is not allowed. "
            f"Allowed types: {', '.join(ALLOWED_TYPES.keys())}"
        )

    # Validate file size
    max_size = ALLOWED_TYPES[mime_type]
    if size_bytes > max_size:
        raise FileTooLargeError(
            f"File size {size_bytes} exceeds maximum {max_size} bytes for {mime_type}"
        )

    # Generate asset ID and storage path
    asset_id = str(uuid4())
    storage_path = generate_storage_path(user_id, asset_id, mime_type)

    logger.info(
        f"[{request_id}] Creating upload URL: user={user_id[:8]}... "
        f"asset={asset_id[:8]}... path={storage_path} size={size_bytes}"
    )

    client = get_service_client()

    # Create signed upload URL
    try:
        # Supabase Storage signed URL for upload
        signed_url_response = client.storage.from_(USER_ASSETS_BUCKET).create_signed_upload_url(
            path=storage_path
        )

        # Extract URL from response (handle both camelCase and snake_case)
        upload_url = signed_url_response.get("signed_url") or signed_url_response.get("signedUrl")
        if not upload_url:
            # Try attribute access for newer SDK versions
            if hasattr(signed_url_response, "signed_url"):
                upload_url = signed_url_response.signed_url
            elif hasattr(signed_url_response, "signedUrl"):
                upload_url = signed_url_response.signedUrl

        if not upload_url:
            logger.error(f"[{request_id}] Failed to extract upload URL from response: {signed_url_response}")
            raise UserAssetError("Failed to create upload URL")

    except Exception as e:
        if isinstance(e, UserAssetError):
            raise
        logger.error(f"[{request_id}] Storage error creating upload URL: {e}")
        raise UserAssetError(f"Failed to create upload URL: {e}")

    # Calculate expiry time
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=UPLOAD_URL_EXPIRY_SECONDS)

    # Insert asset record with status=pending
    try:
        insert_data = {
            "id": asset_id,
            "user_id": user_id,
            "filename": filename[:255],  # Truncate if too long
            "mime_type": mime_type,
            "size_bytes": size_bytes,
            "storage_path": storage_path,
            "status": "pending",
        }
        if task_id:
            insert_data["task_id"] = task_id

        client.table("user_assets").insert(insert_data).execute()

    except Exception as e:
        logger.error(f"[{request_id}] Database error inserting asset record: {e}")
        raise UserAssetError(f"Failed to create asset record: {e}")

    logger.info(
        f"[{request_id}] Upload URL created: asset={asset_id[:8]}... "
        f"expires={expires_at.isoformat()}"
    )

    return UploadUrlResult(
        asset_id=asset_id,
        upload_url=upload_url,
        expires_at=expires_at.isoformat(),
    )


async def commit_asset(
    asset_id: str,
    user_id: str,
    request_id: str = "unknown",
) -> AssetInfo:
    """
    Commit an uploaded asset - verify upload and generate download URL.

    Args:
        asset_id: Asset ID from upload URL response
        user_id: User's ID (for authorization)
        request_id: Request ID for logging

    Returns:
        AssetInfo with signed download URL

    Raises:
        AssetNotFoundError: If asset doesn't exist or doesn't belong to user
        AssetNotPendingError: If asset is not in pending status
    """
    client = get_service_client()

    # Fetch asset record
    try:
        result = client.table("user_assets").select("*").eq("id", asset_id).eq("user_id", user_id).execute()

        if not result.data:
            raise AssetNotFoundError(f"Asset {asset_id} not found")

        asset = result.data[0]

    except AssetNotFoundError:
        raise
    except Exception as e:
        logger.error(f"[{request_id}] Database error fetching asset: {e}")
        raise UserAssetError(f"Failed to fetch asset: {e}")

    # Check status
    if asset["status"] != "pending":
        raise AssetNotPendingError(
            f"Asset {asset_id} is not pending (status={asset['status']})"
        )

    storage_path = asset["storage_path"]

    # Verify file exists in storage (optional - could skip for performance)
    # For now, we trust that if user calls commit, they uploaded

    # Generate signed download URL
    try:
        signed_response = client.storage.from_(USER_ASSETS_BUCKET).create_signed_url(
            storage_path, DOWNLOAD_URL_EXPIRY_SECONDS
        )

        download_url = signed_response.get("signedURL") or signed_response.get("signedUrl")
        if not download_url:
            raise UserAssetError("Failed to create download URL")

    except Exception as e:
        if isinstance(e, UserAssetError):
            raise
        logger.error(f"[{request_id}] Storage error creating download URL: {e}")
        raise UserAssetError(f"Failed to create download URL: {e}")

    # Update asset status to ready
    committed_at = datetime.now(timezone.utc)
    try:
        client.table("user_assets").update({
            "status": "ready",
            "committed_at": committed_at.isoformat(),
        }).eq("id", asset_id).execute()

    except Exception as e:
        logger.error(f"[{request_id}] Database error updating asset status: {e}")
        raise UserAssetError(f"Failed to update asset status: {e}")

    url_expires_at = datetime.now(timezone.utc) + timedelta(seconds=DOWNLOAD_URL_EXPIRY_SECONDS)

    logger.info(
        f"[{request_id}] Asset committed: asset={asset_id[:8]}... "
        f"user={user_id[:8]}... path={storage_path}"
    )

    return AssetInfo(
        id=asset_id,
        filename=asset["filename"],
        mime_type=asset["mime_type"],
        size_bytes=asset["size_bytes"],
        status="ready",
        url=download_url,
        url_expires_at=url_expires_at.isoformat(),
        task_id=asset.get("task_id"),
        created_at=asset["created_at"],
    )


async def list_user_assets(
    user_id: str,
    limit: int = 20,
    cursor: Optional[str] = None,
    task_id: Optional[str] = None,
    request_id: str = "unknown",
) -> Tuple[List[AssetInfo], Optional[str]]:
    """
    List user's committed assets with pagination.

    Args:
        user_id: User's ID
        limit: Max results per page
        cursor: Pagination cursor (asset ID)
        task_id: Optional filter by task
        request_id: Request ID for logging

    Returns:
        Tuple of (assets list, next cursor)
    """
    client = get_service_client()

    try:
        query = (
            client.table("user_assets")
            .select("id, filename, mime_type, size_bytes, status, storage_path, task_id, created_at")
            .eq("user_id", user_id)
            .eq("status", "ready")
            .order("created_at", desc=True)
            .order("id", desc=True)
            .limit(limit + 1)  # Fetch one extra to determine if there's more
        )

        if task_id:
            query = query.eq("task_id", task_id)

        if cursor:
            # Cursor is the last asset ID - fetch assets created before/at that point
            query = query.lt("id", cursor)

        result = query.execute()
        assets = result.data or []

    except Exception as e:
        logger.error(f"[{request_id}] Database error listing assets: {e}")
        raise UserAssetError(f"Failed to list assets: {e}")

    # Determine next cursor
    next_cursor = None
    if len(assets) > limit:
        assets = assets[:limit]
        next_cursor = assets[-1]["id"]

    # Generate signed URLs for each asset
    asset_list = []
    for asset in assets:
        try:
            signed_response = client.storage.from_(USER_ASSETS_BUCKET).create_signed_url(
                asset["storage_path"], DOWNLOAD_URL_EXPIRY_SECONDS
            )
            download_url = signed_response.get("signedURL") or signed_response.get("signedUrl")
        except Exception:
            download_url = None

        url_expires_at = datetime.now(timezone.utc) + timedelta(seconds=DOWNLOAD_URL_EXPIRY_SECONDS)

        asset_list.append(AssetInfo(
            id=asset["id"],
            filename=asset["filename"],
            mime_type=asset["mime_type"],
            size_bytes=asset["size_bytes"],
            status=asset["status"],
            url=download_url,
            url_expires_at=url_expires_at.isoformat() if download_url else None,
            task_id=asset.get("task_id"),
            created_at=asset["created_at"],
        ))

    logger.info(
        f"[{request_id}] Listed assets: user={user_id[:8]}... count={len(asset_list)} "
        f"has_more={next_cursor is not None}"
    )

    return asset_list, next_cursor


async def cleanup_orphaned_assets(request_id: str = "cleanup") -> int:
    """
    Delete orphaned assets (pending status older than ORPHAN_CLEANUP_HOURS).

    This should be called periodically by a cron job or scheduler.

    Returns:
        Number of assets cleaned up
    """
    client = get_service_client()
    cutoff = datetime.now(timezone.utc) - timedelta(hours=ORPHAN_CLEANUP_HOURS)

    logger.info(f"[{request_id}] Starting orphan cleanup: cutoff={cutoff.isoformat()}")

    try:
        # Fetch orphaned assets
        result = (
            client.table("user_assets")
            .select("id, storage_path")
            .eq("status", "pending")
            .lt("created_at", cutoff.isoformat())
            .limit(100)  # Process in batches
            .execute()
        )

        orphans = result.data or []
        if not orphans:
            logger.info(f"[{request_id}] No orphaned assets found")
            return 0

        # Delete from storage and database
        deleted_count = 0
        for orphan in orphans:
            try:
                # Delete from storage
                client.storage.from_(USER_ASSETS_BUCKET).remove([orphan["storage_path"]])

                # Delete from database
                client.table("user_assets").delete().eq("id", orphan["id"]).execute()

                deleted_count += 1
            except Exception as e:
                logger.warning(f"[{request_id}] Failed to cleanup orphan {orphan['id']}: {e}")

        logger.info(f"[{request_id}] Orphan cleanup complete: deleted={deleted_count}")
        return deleted_count

    except Exception as e:
        logger.error(f"[{request_id}] Orphan cleanup error: {e}")
        return 0


async def get_asset_download_url(
    asset_id: str,
    user_id: str,
    request_id: str = "unknown",
) -> AssetInfo:
    """
    Get a fresh signed download URL for an existing asset.

    Args:
        asset_id: Asset ID
        user_id: User's ID (for authorization)
        request_id: Request ID for logging

    Returns:
        AssetInfo with fresh signed URL

    Raises:
        AssetNotFoundError: If asset doesn't exist or doesn't belong to user
    """
    client = get_service_client()

    try:
        result = (
            client.table("user_assets")
            .select("*")
            .eq("id", asset_id)
            .eq("user_id", user_id)
            .eq("status", "ready")
            .execute()
        )

        if not result.data:
            raise AssetNotFoundError(f"Asset {asset_id} not found")

        asset = result.data[0]

    except AssetNotFoundError:
        raise
    except Exception as e:
        logger.error(f"[{request_id}] Database error fetching asset: {e}")
        raise UserAssetError(f"Failed to fetch asset: {e}")

    # Generate fresh signed URL
    try:
        signed_response = client.storage.from_(USER_ASSETS_BUCKET).create_signed_url(
            asset["storage_path"], DOWNLOAD_URL_EXPIRY_SECONDS
        )
        download_url = signed_response.get("signedURL") or signed_response.get("signedUrl")
        if not download_url:
            raise UserAssetError("Failed to create download URL")
    except Exception as e:
        if isinstance(e, UserAssetError):
            raise
        logger.error(f"[{request_id}] Storage error creating download URL: {e}")
        raise UserAssetError(f"Failed to create download URL: {e}")

    url_expires_at = datetime.now(timezone.utc) + timedelta(seconds=DOWNLOAD_URL_EXPIRY_SECONDS)

    return AssetInfo(
        id=asset_id,
        filename=asset["filename"],
        mime_type=asset["mime_type"],
        size_bytes=asset["size_bytes"],
        status="ready",
        url=download_url,
        url_expires_at=url_expires_at.isoformat(),
        task_id=asset.get("task_id"),
        created_at=asset["created_at"],
    )
