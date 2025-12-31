"""
Database connection management for PostgreSQL.
Uses the `databases` library for async operations.
"""
import logging
import os

from databases import Database

logger = logging.getLogger(__name__)

# Database URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/aiclipx")

# Handle Render's postgres:// URL format (convert to postgresql://)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

database = Database(DATABASE_URL)

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


async def init_db():
    """Initialize database connection and create tables if needed."""
    logger.info("Connecting to database...")
    await database.connect()
    logger.info("Database connected successfully")

    # Create tables
    logger.info("Creating tables if not exist...")
    await database.execute(CREATE_TABLE_SQL)
    for idx_sql in CREATE_INDEX_SQL:
        await database.execute(idx_sql)

    # Run migrations
    logger.info("Running migrations...")
    await database.execute(ADD_PROMPT_COLUMN_SQL)
    await database.execute(ADD_STG8_COLUMNS_SQL)
    await database.execute(MIGRATE_PENDING_TO_QUEUED_SQL)
    logger.info("Database tables ready")


async def close_db():
    """Close database connection."""
    logger.info("Closing database connection...")
    await database.disconnect()
    logger.info("Database connection closed")
