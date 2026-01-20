-- BE-STG12-009: Add timestamp columns for status transitions
-- Run this in Supabase SQL Editor

-- Add processing_at: set once when entering 'processing'
ALTER TABLE video_tasks ADD COLUMN IF NOT EXISTS processing_at TIMESTAMPTZ;

-- Add completed_at: set once when entering 'completed'
ALTER TABLE video_tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add failed_at: set once when entering 'failed'
ALTER TABLE video_tasks ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;

-- Create indexes for querying by status timestamps (optional, for analytics)
CREATE INDEX IF NOT EXISTS idx_video_tasks_processing_at ON video_tasks(processing_at) WHERE processing_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_video_tasks_completed_at ON video_tasks(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_video_tasks_failed_at ON video_tasks(failed_at) WHERE failed_at IS NOT NULL;
