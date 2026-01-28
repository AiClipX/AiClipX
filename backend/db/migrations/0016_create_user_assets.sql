-- BE-STG13-013: User assets table for upload tracking
-- Supports signed URL upload flow with orphan cleanup

CREATE TABLE IF NOT EXISTS user_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    task_id VARCHAR(50) REFERENCES video_tasks(id) ON DELETE SET NULL,

    -- File metadata
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_path VARCHAR(500) NOT NULL,

    -- Status: pending (upload URL issued), ready (committed), deleted (soft delete)
    status VARCHAR(20) NOT NULL DEFAULT 'pending',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    committed_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT chk_status CHECK (status IN ('pending', 'ready', 'deleted')),
    CONSTRAINT chk_size_positive CHECK (size_bytes > 0),
    CONSTRAINT chk_committed_status CHECK (
        (status = 'ready' AND committed_at IS NOT NULL) OR
        (status != 'ready')
    )
);

-- Index for user's asset listing (most common query)
CREATE INDEX IF NOT EXISTS idx_user_assets_user_list
ON user_assets(user_id, created_at DESC, id DESC)
WHERE status = 'ready';

-- Index for orphan cleanup job (pending assets older than X hours)
CREATE INDEX IF NOT EXISTS idx_user_assets_orphan_cleanup
ON user_assets(created_at)
WHERE status = 'pending';

-- Index for task-linked assets
CREATE INDEX IF NOT EXISTS idx_user_assets_task
ON user_assets(task_id)
WHERE task_id IS NOT NULL AND status = 'ready';

-- Unique constraint on storage_path (no duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_assets_storage_path
ON user_assets(storage_path);

-- Enable RLS
ALTER TABLE user_assets ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can only see their own assets
DROP POLICY IF EXISTS user_assets_user_isolation ON user_assets;
CREATE POLICY user_assets_user_isolation ON user_assets
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Service role bypass
DROP POLICY IF EXISTS user_assets_service_role ON user_assets;
CREATE POLICY user_assets_service_role ON user_assets
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE user_assets IS 'BE-STG13-013: User uploaded assets with signed URL support';
COMMENT ON COLUMN user_assets.status IS 'pending=upload URL issued, ready=committed, deleted=soft deleted';
COMMENT ON COLUMN user_assets.storage_path IS 'Internal path in user-assets bucket: user-assets/{user_id}/{date}/{asset_id}.{ext}';
