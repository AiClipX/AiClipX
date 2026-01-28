DO $$
BEGIN
    -- Step 1: Create composite indexes for list queries
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_video_tasks_user_created'
    ) THEN
        CREATE INDEX idx_video_tasks_user_created
        ON video_tasks(user_id, created_at DESC, id DESC);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_video_tasks_user_status_created'
    ) THEN
        CREATE INDEX idx_video_tasks_user_status_created
        ON video_tasks(user_id, status, created_at DESC, id DESC);
    END IF;

    -- Step 2: Drop redundant single-column indexes
    DROP INDEX IF EXISTS idx_video_tasks_created_at;
    DROP INDEX IF EXISTS idx_video_tasks_status;
    DROP INDEX IF EXISTS idx_video_tasks_user_id;

    -- Step 3: Add status enum constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_status_enum'
    ) THEN
        ALTER TABLE video_tasks ADD CONSTRAINT chk_status_enum
        CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled'));
    END IF;

    -- Step 4: Add integrity constraints
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_video_url_status'
    ) THEN
        ALTER TABLE video_tasks ADD CONSTRAINT chk_video_url_status
        CHECK (status = 'completed' OR video_url IS NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_error_message_status'
    ) THEN
        ALTER TABLE video_tasks ADD CONSTRAINT chk_error_message_status
        CHECK (status = 'failed' OR error_message IS NULL);
    END IF;
END $$;
