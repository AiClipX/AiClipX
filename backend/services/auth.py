# -*- coding: utf-8 -*-
"""
JWT Authentication module for BE-AUTH-001.

Provides FastAPI dependencies for verifying Supabase JWTs
and extracting user information.
"""

import logging
import os
from dataclasses import dataclass
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

logger = logging.getLogger(__name__)


def mask_token(token: str, visible_chars: int = 12) -> str:
    """
    Mask a JWT token for safe logging.

    Args:
        token: JWT token string (with or without 'Bearer ' prefix)
        visible_chars: Number of characters to show (default 12)

    Returns:
        Masked token string, e.g., "Bearer eyJhbGciOi..."

    Example:
        >>> mask_token("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx")
        'eyJhbGciOiJI...'
        >>> mask_token("Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx")
        'Bearer eyJhbGciOiJI...'
    """
    if not token:
        return "<empty>"

    # Handle "Bearer " prefix
    if token.startswith("Bearer "):
        prefix = "Bearer "
        actual_token = token[7:]
    else:
        prefix = ""
        actual_token = token

    if len(actual_token) <= visible_chars:
        return f"{prefix}{actual_token}"

    return f"{prefix}{actual_token[:visible_chars]}..."


# Supabase JWT secret (from project settings)
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "").strip()

# LOCAL_DEV mode: ONLY for local development, never in production
# Requires explicit opt-in via LOCAL_DEV=true environment variable
LOCAL_DEV = os.getenv("LOCAL_DEV", "").lower() == "true"

# Fail-fast validation at startup
if not SUPABASE_JWT_SECRET and not LOCAL_DEV:
    raise RuntimeError(
        "SECURITY ERROR: SUPABASE_JWT_SECRET is required in production. "
        "Set SUPABASE_JWT_SECRET environment variable or enable LOCAL_DEV=true for development only."
    )

# Test secret - only used when LOCAL_DEV=true AND SUPABASE_JWT_SECRET not set
_TEST_JWT_SECRET = "local-test-secret-do-not-use-in-production"

# Security scheme
security = HTTPBearer(auto_error=False)


class AuthError(Exception):
    """Authentication error."""
    pass


@dataclass
class AuthUser:
    """Authenticated user information extracted from JWT."""
    id: str  # user UUID (sub claim)
    email: Optional[str] = None
    role: Optional[str] = None
    jwt_token: str = ""  # Original token for Supabase client


def verify_jwt(token: str) -> dict:
    """
    Verify a Supabase JWT token.

    Args:
        token: JWT token string

    Returns:
        Decoded token payload

    Raises:
        AuthError: If token is invalid or expired
    """
    # Determine which secret to use
    secret = SUPABASE_JWT_SECRET
    if not secret:
        if LOCAL_DEV:
            logger.warning("Using LOCAL_DEV test JWT secret - DO NOT USE IN PRODUCTION")
            secret = _TEST_JWT_SECRET
        else:
            # This should never happen due to startup validation, but kept for defense in depth
            raise AuthError("SUPABASE_JWT_SECRET not configured")

    try:
        # Supabase uses HS256 algorithm
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthError("Token has expired")
    except jwt.InvalidAudienceError:
        raise AuthError("Invalid token audience")
    except jwt.InvalidTokenError as e:
        raise AuthError(f"Invalid token: {e}")


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> AuthUser:
    """
    FastAPI dependency to get the current authenticated user.

    Extracts and verifies JWT from Authorization header.
    Returns AuthUser with user_id and original token.

    Usage:
        @router.get("/protected")
        async def protected_endpoint(user: AuthUser = Depends(get_current_user)):
            print(f"User ID: {user.id}")
    """
    request_id = getattr(request.state, "request_id", "unknown")

    if credentials is None:
        logger.warning(f"[{request_id}] No authorization header provided")
        raise HTTPException(
            status_code=401,
            detail="Authorization header required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        payload = verify_jwt(token)
    except AuthError as e:
        logger.warning(f"[{request_id}] JWT verification failed: {e}")
        raise HTTPException(
            status_code=401,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract user info from JWT claims
    user_id = payload.get("sub")
    if not user_id:
        logger.warning(f"[{request_id}] JWT missing 'sub' claim")
        raise HTTPException(
            status_code=401,
            detail="Invalid token: missing user ID",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = AuthUser(
        id=user_id,
        email=payload.get("email"),
        role=payload.get("role"),
        jwt_token=token,
    )

    logger.info(f"[{request_id}] Authenticated user: {user_id[:8]}...")

    return user


async def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[AuthUser]:
    """
    FastAPI dependency for optional authentication.

    Returns AuthUser if valid token provided, None otherwise.
    Does not raise 401 for missing/invalid token.

    Usage:
        @router.get("/public-or-private")
        async def endpoint(user: Optional[AuthUser] = Depends(get_optional_user)):
            if user:
                # Authenticated request
            else:
                # Anonymous request
    """
    if credentials is None:
        return None

    try:
        return await get_current_user(request, credentials)
    except HTTPException:
        return None
