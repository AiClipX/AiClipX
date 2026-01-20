# -*- coding: utf-8 -*-
"""
Supabase client module for BE-AUTH-001.

Provides two client types:
- User client: Initialized with user JWT for RLS-enforced queries (auth.uid())
- Service client: Uses service_role key for background jobs (bypasses RLS)
"""

import logging
import os
from typing import Optional

from supabase import create_client, Client

logger = logging.getLogger(__name__)

# Environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "").strip()
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "").strip()


class SupabaseClientError(Exception):
    """Raised when Supabase client configuration is invalid."""
    pass


def _validate_config():
    """Validate required environment variables."""
    if not SUPABASE_URL:
        raise SupabaseClientError("SUPABASE_URL environment variable is required")
    if not SUPABASE_ANON_KEY:
        raise SupabaseClientError("SUPABASE_ANON_KEY environment variable is required")
    if not SUPABASE_SERVICE_KEY:
        raise SupabaseClientError("SUPABASE_SERVICE_KEY environment variable is required")


# Shared service_role client for background jobs (bypasses RLS)
_service_client: Optional[Client] = None


def get_service_client() -> Client:
    """
    Get the shared service_role client for background jobs.
    This client bypasses RLS and can access all data.

    Use for:
    - Background workers (Runway processing)
    - Migrations and admin operations
    - Status updates without user context
    """
    global _service_client

    if _service_client is None:
        _validate_config()
        _service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        logger.info("Supabase service_role client initialized")

    return _service_client


def get_user_client(jwt_token: str) -> Client:
    """
    Create a Supabase client authenticated with user's JWT.
    RLS policies are enforced via auth.uid().

    Use for:
    - User-facing API endpoints
    - Any query that should respect row-level security

    Args:
        jwt_token: The user's Supabase JWT (from Authorization header)

    Returns:
        Supabase client with user context
    """
    _validate_config()

    # Create client with anon key
    client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

    # Set the JWT token directly on the PostgREST client headers
    # This avoids Supabase Auth validation but enables RLS via auth.uid()
    client.postgrest.auth(jwt_token)

    return client


def init_supabase():
    """Initialize Supabase clients on startup."""
    _validate_config()
    # Pre-initialize service client
    get_service_client()
    logger.info(f"Supabase initialized: {SUPABASE_URL[:30]}...")


def is_supabase_configured() -> bool:
    """Check if Supabase is properly configured."""
    return bool(SUPABASE_URL and SUPABASE_ANON_KEY and SUPABASE_SERVICE_KEY)
