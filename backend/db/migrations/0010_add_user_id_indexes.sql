-- Migration: 0010_add_user_id_indexes
-- Description: BE-AUTH-001 - Add indexes on user_id for query performance
-- Created: 2026-01-07

CREATE INDEX IF NOT EXISTS idx_video_tasks_user_id ON video_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tts_requests_user_id ON tts_requests(user_id);
