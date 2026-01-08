-- Migration: 0003_add_stg8_columns
-- Description: BE-STG8 - Add source_image_url, engine, params, progress columns
-- Created: 2026-01-07

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
