-- Migration: 0009_user_id_not_null
-- Description: BE-AUTH-001 - Make user_id NOT NULL after cleanup
-- Created: 2026-01-07

-- Make video_tasks.user_id NOT NULL
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'video_tasks' AND column_name = 'user_id' AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE video_tasks ALTER COLUMN user_id SET NOT NULL;
    END IF;
END $$;

-- Make tts_requests.user_id NOT NULL
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tts_requests' AND column_name = 'user_id' AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE tts_requests ALTER COLUMN user_id SET NOT NULL;
    END IF;
END $$;
