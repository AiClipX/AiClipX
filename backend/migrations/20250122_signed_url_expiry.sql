-- BE-STG13-003: Add video URL expiration tracking for signed URLs
-- Run this in Supabase SQL Editor

-- Add video_url_expires_at: tracks when the signed video URL expires
ALTER TABLE video_tasks ADD COLUMN IF NOT EXISTS video_url_expires_at TIMESTAMPTZ;

-- Create index for querying expired URLs (for potential cleanup/refresh jobs)
CREATE INDEX IF NOT EXISTS idx_video_tasks_video_url_expires_at
ON video_tasks(video_url_expires_at)
WHERE video_url_expires_at IS NOT NULL;
