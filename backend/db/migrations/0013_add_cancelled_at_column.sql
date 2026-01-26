-- BE-STG13-008: Add cancelled_at timestamp column for cancel support
ALTER TABLE video_tasks ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ DEFAULT NULL;
