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

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])


# Request/Response Models
class SignUpRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password (min 6 characters)")


class SignInRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    """Simplified auth response for frontend."""
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    """User info response."""
    id: str
    email: Optional[str] = None
    role: Optional[str] = None


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

        # Sign up using Supabase Auth Admin API (auto-confirm for MVP)
        # Using admin API to bypass email confirmation
        response = client.auth.admin.create_user({
            "email": body.email,
            "password": body.password,
            "email_confirm": True,  # Auto-confirm for MVP
        })

        # Check for errors
        if response.user is None:
            logger.warning(f"[{request_id}] Signup failed: no user returned")
            return error_response(
                request, 400, "SIGNUP_FAILED",
                "Failed to create user account"
            )

        user = response.user
        logger.info(f"[{request_id}] User created: user_id={user.id[:8]}...")

        # Admin API doesn't return session, so sign in to get access token
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
                "token_type": "bearer",
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "created_at": str(user.created_at) if user.created_at else None,
                },
            },
            headers={"X-Request-Id": request_id},
        )

    except Exception as e:
        error_msg = str(e)
        logger.error(f"[{request_id}] Signup error: {error_msg}")

        # Handle specific Supabase errors
        # "User not allowed" is returned by Admin API when email already exists (403)
        # "already been registered" is returned by regular signup API
        error_lower = error_msg.lower()
        if any(phrase in error_lower for phrase in ["already registered", "already exists", "user not allowed", "already been registered"]):
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
    },
)
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
            "token_type": "bearer",
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
    response_model=UserResponse,
    responses={
        200: {"description": "Current user info"},
        401: {"description": "Not authenticated", "model": ErrorResponse},
    },
)
async def get_me(request: Request, user: AuthUser = Depends(get_current_user)):
    """
    Get current authenticated user information.

    Requires valid JWT in Authorization header.
    """
    request_id = getattr(request.state, "request_id", "unknown")
    logger.info(f"[{request_id}] Get me: user_id={user.id[:8]}...")

    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
    }
