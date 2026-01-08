-- Migration: 0007_add_user_id_columns
-- Description: BE-AUTH-001 - Add user_id column to video_tasks and tts_requests
-- Created: 2026-01-07

-- Add user_id to video_tasks
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'video_tasks' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE video_tasks ADD COLUMN user_id UUID;
    END IF;
END $$;

-- Add user_id to tts_requests
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tts_requests' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE tts_requests ADD COLUMN user_id UUID;
    END IF;
END $$;
