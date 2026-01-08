# -*- coding: utf-8 -*-
"""
Database connection management for PostgreSQL.

Uses the `databases` library for async operations.
Migrations are handled by db/migrate.py (Drizzle-style SQL files).
"""

import logging
import os

from databases import Database

from db.migrate import run_migrations

logger = logging.getLogger(__name__)

# Database URL from environment variable - REQUIRED, no fallback
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is required but not set. "
        "Please configure DATABASE_URL with your Supabase PostgreSQL connection string."
    )

# Handle Render's postgres:// URL format (convert to postgresql://)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# For Supabase: use direct connection (port 5432) instead of pooler (port 6543)
# Transaction pooler doesn't support prepared statements which asyncpg uses
if "pooler.supabase.com:6543" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace(":6543", ":5432")
    logger.info("Switched from Supabase pooler (6543) to direct connection (5432)")

# Connection pool config (BE-ENGINE-002: prevent connection exhaustion)
# Safe for Supabase free tier (~15-20 max connections)
DB_POOL_MIN_SIZE = 1
DB_POOL_MAX_SIZE = 5

# Mask password for logging
def _mask_url(url: str) -> str:
    """Mask password in database URL for safe logging."""
    import re
    return re.sub(r':([^:@]+)@', r':********@', url)

database = Database(DATABASE_URL, min_size=DB_POOL_MIN_SIZE, max_size=DB_POOL_MAX_SIZE)

# Track database connection state
_db_connected = False


async def init_db():
    """
    Initialize database connection and run pending migrations.

    Migrations are stored in db/migrations/*.sql and executed in order.
    See db/migrate.py for migration runner implementation.
    """
    global _db_connected

    logger.info(f"Connecting to database (pool: min={DB_POOL_MIN_SIZE}, max={DB_POOL_MAX_SIZE})...")
    await database.connect()
    _db_connected = True
    logger.info(f"Connected to database {_mask_url(DATABASE_URL)}")

    # Run file-based migrations (Drizzle-style)
    logger.info("Running migrations...")
    try:
        count = await run_migrations(database)
        logger.info(f"Database ready ({count} migrations applied)")
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise


async def close_db():
    """Close database connection."""
    global _db_connected

    logger.info("Closing database connection...")
    await database.disconnect()
    _db_connected = False
    logger.info(f"Disconnected from database {_mask_url(DATABASE_URL)}")


async def check_db_health() -> bool:
    """Check if database connection is healthy."""
    global _db_connected

    if not _db_connected:
        return False

    try:
        await database.execute("SELECT 1")
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False


def is_db_connected() -> bool:
    """Return current database connection state."""
    return _db_connected
