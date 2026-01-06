"""
Database connection management for PostgreSQL.
Uses the `databases` library for async operations.
"""
import logging
import os

from databases import Database

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

database = Database(DATABASE_URL)

# Track database connection state
_db_connected = False

# SQL for table creation
CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS video_tasks (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(500),
    prompt TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    video_url TEXT,
    error_message TEXT
);
"""

CREATE_INDEX_SQL = [
    "CREATE INDEX IF NOT EXISTS idx_video_tasks_created_at ON video_tasks(created_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_video_tasks_status ON video_tasks(status);",
]

# Migration: Add prompt column if not exists
ADD_PROMPT_COLUMN_SQL = """
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'video_tasks' AND column_name = 'prompt'
    ) THEN
        ALTER TABLE video_tasks ADD COLUMN prompt TEXT;
    END IF;
END $$;
"""

# Migration: BE-STG8 - Add source_image_url, engine, params columns
ADD_STG8_COLUMNS_SQL = """
DO $$
BEGIN
    -- Add source_image_url column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'video_tasks' AND column_name = 'source_image_url'
    ) THEN
        ALTER TABLE video_tasks ADD COLUMN source_image_url TEXT;
    END IF;

    -- Add engine column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'video_tasks' AND column_name = 'engine'
    ) THEN
        ALTER TABLE video_tasks ADD COLUMN engine VARCHAR(20) DEFAULT 'mock';
    END IF;

    -- Add params column (JSONB)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'video_tasks' AND column_name = 'params'
    ) THEN
        ALTER TABLE video_tasks ADD COLUMN params JSONB;
    END IF;

    -- Add progress column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'video_tasks' AND column_name = 'progress'
    ) THEN
        ALTER TABLE video_tasks ADD COLUMN progress INTEGER DEFAULT 0;
    END IF;
END $$;
"""

# Migration: Rename pending -> queued
MIGRATE_PENDING_TO_QUEUED_SQL = """
UPDATE video_tasks SET status = 'queued' WHERE status = 'pending';
"""

# BE-DB-PERSIST-001: tts_requests table
CREATE_TTS_REQUESTS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS tts_requests (
    id VARCHAR(50) PRIMARY KEY,
    request_id VARCHAR(50),
    locale VARCHAR(20),
    voice VARCHAR(100),
    text_len INTEGER,
    ssml TEXT,
    audio_url TEXT NOT NULL,
    bytes INTEGER NOT NULL,
    format VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
"""

CREATE_TTS_REQUESTS_INDEX_SQL = [
    "CREATE INDEX IF NOT EXISTS idx_tts_requests_created_at ON tts_requests(created_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_tts_requests_voice ON tts_requests(voice);",
]


async def init_db():
    """Initialize database connection and create tables if needed."""
    global _db_connected

    logger.info("Connecting to database...")
    await database.connect()
    _db_connected = True
    logger.info("Database connected successfully")

    # Create tables
    logger.info("Creating tables if not exist...")
    await database.execute(CREATE_TABLE_SQL)
    for idx_sql in CREATE_INDEX_SQL:
        await database.execute(idx_sql)

    # Create tts_requests table (BE-DB-PERSIST-001)
    await database.execute(CREATE_TTS_REQUESTS_TABLE_SQL)
    for idx_sql in CREATE_TTS_REQUESTS_INDEX_SQL:
        await database.execute(idx_sql)

    # Run migrations
    logger.info("Running migrations...")
    await database.execute(ADD_PROMPT_COLUMN_SQL)
    await database.execute(ADD_STG8_COLUMNS_SQL)
    await database.execute(MIGRATE_PENDING_TO_QUEUED_SQL)
    logger.info("Database tables ready")


async def close_db():
    """Close database connection."""
    global _db_connected

    logger.info("Closing database connection...")
    await database.disconnect()
    _db_connected = False
    logger.info("Database connection closed")


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
