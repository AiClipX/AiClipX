DO $$
BEGIN
    -- Create audit_logs table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'audit_logs'
    ) THEN
        CREATE TABLE audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            actor_user_id UUID,
            action VARCHAR(50) NOT NULL,
            entity_type VARCHAR(30) NOT NULL,
            entity_id VARCHAR(100),
            request_id VARCHAR(64),
            ip VARCHAR(45),
            user_agent TEXT,
            meta JSONB
        );
    END IF;

    -- Index for entity queries (e.g., all logs for a specific task)
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_entity'
    ) THEN
        CREATE INDEX idx_audit_logs_entity
        ON audit_logs(entity_type, entity_id, occurred_at DESC);
    END IF;

    -- Index for actor queries (e.g., all actions by a user)
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_actor'
    ) THEN
        CREATE INDEX idx_audit_logs_actor
        ON audit_logs(actor_user_id, occurred_at DESC);
    END IF;

    -- Index for time-based queries
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_occurred'
    ) THEN
        CREATE INDEX idx_audit_logs_occurred
        ON audit_logs(occurred_at DESC);
    END IF;
END $$;
