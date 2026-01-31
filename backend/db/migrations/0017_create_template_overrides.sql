-- BE-STG13-023: Template overrides for runtime toggle
-- This table stores runtime overrides for template settings
-- The JSON file remains source of truth, this only overrides 'enabled' flag

CREATE TABLE IF NOT EXISTS template_overrides (
    template_id TEXT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by TEXT  -- admin identifier or "system"
);

-- Index for audit/reporting queries
CREATE INDEX IF NOT EXISTS idx_template_overrides_updated_at
    ON template_overrides(updated_at DESC);

-- Comment for documentation
COMMENT ON TABLE template_overrides IS
    'BE-STG13-023: Runtime overrides for template settings. JSON file is source of truth.';
COMMENT ON COLUMN template_overrides.template_id IS
    'Template ID from templates.json';
COMMENT ON COLUMN template_overrides.enabled IS
    'Override for enabled flag (true/false)';
COMMENT ON COLUMN template_overrides.updated_by IS
    'Who made the change (admin username or system)';
