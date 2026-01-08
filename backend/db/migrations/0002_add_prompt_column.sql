-- Migration: 0002_add_prompt_column
-- Description: Add prompt column to video_tasks (idempotent)
-- Created: 2026-01-07

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'video_tasks' AND column_name = 'prompt'
    ) THEN
        ALTER TABLE video_tasks ADD COLUMN prompt TEXT;
    END IF;
END $$;
