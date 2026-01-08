-- Migration: 0001_add_video_tasks_indexes
-- Description: Add indexes for video_tasks table
-- Created: 2026-01-07

CREATE INDEX IF NOT EXISTS idx_video_tasks_created_at ON video_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_tasks_status ON video_tasks(status);
