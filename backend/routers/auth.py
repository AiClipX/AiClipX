# -*- coding: utf-8 -*-
"""
Auth Router for BE-AUTH-002.

Provides authentication endpoints using Supabase Auth:
- POST /api/auth/signup - Register new user
- POST /api/auth/signin - Login and get JWT
- GET /api/auth/me - Get current user info
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, EmailStr, Field

from services.supabase_client import get_service_client
from services.auth import get_current_user, AuthUser
from services.ratelimit import limiter, RATE_LIMIT_AUTH_SIGNIN

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])


# Request/Response Models
class SignUpRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password (min 6 characters)")


class SignInRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    """Request body for token refresh."""
    refresh_token: str = Field(..., description="Refresh token from signin response")


class AuthResponse(BaseModel):
    """Auth response with tokens for frontend."""
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int = Field(default=3600, description="Access token TTL in seconds")
    user: dict


class UserInfo(BaseModel):
    """User info."""
    id: str
    email: Optional[str] = None


class MeResponse(BaseModel):
    """Response for /api/auth/me endpoint."""
    user: UserInfo


class ErrorResponse(BaseModel):
    code: str
    message: str
    requestId: str
    details: dict = {}


def error_response(request: Request, status_code: int, code: str, message: str, details: dict = None):
    """Create standardized error response."""
    from fastapi.responses import JSONResponse
    request_id = getattr(request.state, "request_id", "unknown")
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


@router.post(
    "/signup",
    response_model=AuthResponse,
    responses={
        201: {"description": "User created successfully"},
        409: {"description": "Email already exists", "model": ErrorResponse},
        422: {"description": "Validation error", "model": ErrorResponse},
    },
)
async def signup(request: Request, body: SignUpRequest):
    """
    Register a new user with email and password.

    Returns JWT access token on success.
    Email confirmation is disabled for MVP.
    """
    request_id = getattr(request.state, "request_id", "unknown")
    logger.info(f"[{request_id}] Signup attempt for: {body.email}")

    try:
        client = get_service_client()

        # Sign up using regular Supabase Auth API
        # Note: Requires "Confirm email" to be DISABLED in Supabase Auth settings
        # or user will need to confirm email before signing in
        response = client.auth.sign_up({
            "email": body.email,
            "password": body.password,
        })

        # Check for errors
        if response.user is None:
            logger.warning(f"[{request_id}] Signup failed: no user returned")
            return error_response(
                request, 400, "SIGNUP_FAILED",
                "Failed to create user account"
            )

        user = response.user
        session = response.session
        logger.info(f"[{request_id}] User created: user_id={user.id[:8]}...")

        # If session is returned, user is auto-confirmed
        if session:
            signin_response = response
        else:
            # Try to sign in (works if email confirmation is disabled)
            signin_response = client.auth.sign_in_with_password({
                "email": body.email,
                "password": body.password,
            })

        if signin_response.session is None:
            logger.error(f"[{request_id}] Failed to get session after signup")
            return error_response(
                request, 500, "SESSION_ERROR",
                "Account created but failed to generate access token"
            )

        logger.info(f"[{request_id}] Signup successful: user_id={user.id[:8]}...")

        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=201,
            content={
                "access_token": signin_response.session.access_token,
                "refresh_token": signin_response.session.refresh_token,
                "token_type": "bearer",
                "expires_in": signin_response.session.expires_in or 3600,
                "user": {
                    "id": user.id,
                    "email": user.email,
                },
            },
            headers={"X-Request-Id": request_id},
        )

    except Exception as e:
        error_msg = str(e)
        logger.error(f"[{request_id}] Signup error: {error_msg}")

        # Handle specific Supabase errors
        # Regular signup API returns "already been registered" for duplicate emails
        error_lower = error_msg.lower()
        if any(phrase in error_lower for phrase in ["already registered", "already exists", "already been registered"]):
            return error_response(
                request, 409, "EMAIL_EXISTS",
                "An account with this email already exists"
            )

        return error_response(
            request, 500, "SIGNUP_ERROR",
            "Failed to create account",
            {"error": error_msg}
        )


@router.post(
    "/signin",
    response_model=AuthResponse,
    responses={
        200: {"description": "Login successful"},
        401: {"description": "Invalid credentials", "model": ErrorResponse},
        422: {"description": "Validation error", "model": ErrorResponse},
        429: {"description": "Rate limit exceeded", "model": ErrorResponse},
    },
)
@limiter.limit(RATE_LIMIT_AUTH_SIGNIN)
async def signin(request: Request, body: SignInRequest):
    """
    Sign in with email and password.

    Returns JWT access token on success.
    """
    request_id = getattr(request.state, "request_id", "unknown")
    logger.info(f"[{request_id}] Signin attempt for: {body.email}")

    try:
        client = get_service_client()

        # Sign in using Supabase Auth
        response = client.auth.sign_in_with_password({
            "email": body.email,
            "password": body.password,
        })

        if response.user is None or response.session is None:
            logger.warning(f"[{request_id}] Signin failed: invalid credentials")
            return error_response(
                request, 401, "INVALID_CREDENTIALS",
                "Invalid email or password"
            )

        logger.info(f"[{request_id}] Signin successful: user_id={response.user.id[:8]}...")

        return {
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "token_type": "bearer",
            "expires_in": response.session.expires_in or 3600,
            "user": {
                "id": response.user.id,
                "email": response.user.email,
            },
        }

    except Exception as e:
        error_msg = str(e)
        logger.error(f"[{request_id}] Signin error: {error_msg}")

        # Handle invalid credentials
        if "invalid" in error_msg.lower() or "credentials" in error_msg.lower():
            return error_response(
                request, 401, "INVALID_CREDENTIALS",
                "Invalid email or password"
            )

        # Handle email not confirmed
        if "not confirmed" in error_msg.lower():
            return error_response(
                request, 401, "EMAIL_NOT_CONFIRMED",
                "Please confirm your email before signing in"
            )

        return error_response(
            request, 500, "SIGNIN_ERROR",
            "Failed to sign in",
            {"error": error_msg}
        )


@router.get(
    "/me",
    response_model=MeResponse,
    responses={
        200: {"description": "Current user info"},
        401: {"description": "Not authenticated", "model": ErrorResponse},
    },
)
async def get_me(request: Request, user: AuthUser = Depends(get_current_user)):
    """
    Get current authenticated user information.

    Requires valid JWT in Authorization header.
    Returns user id and email.

    BE-STG12-005: FE should redirect to login on 401.
    """
    request_id = getattr(request.state, "request_id", "unknown")
    logger.info(f"[{request_id}] GET /auth/me → 200 | user={user.id[:8]}...")

    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=200,
        content={
            "user": {
                "id": user.id,
                "email": user.email,
            }
        },
        headers={"X-Request-Id": request_id},
    )


@router.post(
    "/refresh",
    response_model=AuthResponse,
    responses={
        200: {"description": "Token refreshed successfully"},
        401: {"description": "Invalid or expired refresh token", "model": ErrorResponse},
    },
)
async def refresh_token(request: Request, body: RefreshRequest):
    """
    Refresh access token using refresh token.

    Returns new access_token and refresh_token.
    Use this when access_token expires (default: 1 hour).
    """
    request_id = getattr(request.state, "request_id", "unknown")
    logger.info(f"[{request_id}] Token refresh attempt")

    try:
        client = get_service_client()

        # Refresh session using Supabase Auth
        response = client.auth.refresh_session(body.refresh_token)

        if response.session is None:
            logger.warning(f"[{request_id}] Refresh failed: invalid refresh token")
            return error_response(
                request, 401, "INVALID_REFRESH_TOKEN",
                "Invalid or expired refresh token"
            )

        user_id = response.user.id if response.user else "unknown"
        logger.info(f"[{request_id}] Token refreshed: user_id={user_id[:8]}...")

        return {
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "token_type": "bearer",
            "expires_in": response.session.expires_in or 3600,
            "user": {
                "id": response.user.id,
                "email": response.user.email,
            } if response.user else {},
        }

    except Exception as e:
        error_msg = str(e)
        logger.error(f"[{request_id}] Refresh error: {error_msg}")

        # Handle invalid/expired refresh token
        if "invalid" in error_msg.lower() or "expired" in error_msg.lower():
            return error_response(
                request, 401, "INVALID_REFRESH_TOKEN",
                "Invalid or expired refresh token"
            )

        return error_response(
            request, 500, "REFRESH_ERROR",
            "Failed to refresh token",
            {"error": error_msg}
        )


async def _do_logout(request: Request, user: AuthUser):
    """
    Internal logout logic shared by /signout and /logout endpoints.

    BE-STG12-005: FE should clear localStorage token after logout.
    """
    request_id = getattr(request.state, "request_id", "unknown")
    logger.info(f"[{request_id}] POST /auth/logout | user={user.id[:8]}...")

    try:
        client = get_service_client()
        # Sign out using Supabase Auth (invalidates session server-side)
        client.auth.sign_out()
        logger.info(f"[{request_id}] POST /auth/logout → 200 | user={user.id[:8]}...")
    except Exception as e:
        # Even if signout fails on Supabase side, return success
        # (client should still clear local tokens)
        logger.warning(f"[{request_id}] Logout warning: {e} | user={user.id[:8]}...")

    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=200,
        content={"message": "Signed out successfully"},
        headers={"X-Request-Id": request_id},
    )


@router.post(
    "/signout",
    responses={
        200: {"description": "Signed out successfully"},
        401: {"description": "Not authenticated", "model": ErrorResponse},
    },
)
async def signout(request: Request, user: AuthUser = Depends(get_current_user)):
    """
    Sign out and invalidate the current session.

    Requires valid JWT in Authorization header.
    After signout, the refresh token will no longer work.
    """
    return await _do_logout(request, user)


@router.post(
    "/logout",
    responses={
        200: {"description": "Logged out successfully"},
        401: {"description": "Not authenticated", "model": ErrorResponse},
    },
)
async def logout(request: Request, user: AuthUser = Depends(get_current_user)):
    """
    Alias for /signout - Log out and invalidate the current session.

    Requires valid JWT in Authorization header.
    BE-STG12-005: FE should clear localStorage token after this call.
    """
    return await _do_logout(request, user)
