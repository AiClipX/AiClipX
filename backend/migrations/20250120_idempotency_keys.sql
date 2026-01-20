-- BE-STG12-004: Persistent Idempotency Keys
-- Run this in Supabase SQL Editor

-- Create idempotency_keys table
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  task_id TEXT NOT NULL,
  response_body JSONB,  -- Store full response for exact replay
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Composite unique: same user + same key = one record
  UNIQUE(user_id, idempotency_key)
);

-- Index for TTL cleanup job
CREATE INDEX IF NOT EXISTS idx_idempotency_created_at
ON idempotency_keys(created_at);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_idempotency_user_key
ON idempotency_keys(user_id, idempotency_key);

-- RLS: Users can only see their own idempotency keys
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own idempotency keys"
ON idempotency_keys FOR SELECT
TO authenticated
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own idempotency keys"
ON idempotency_keys FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid()::text);

-- Service role can do everything (for cleanup job)
CREATE POLICY "Service role full access"
ON idempotency_keys FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Optional: Function to cleanup old keys (run via pg_cron or manual)
-- DELETE FROM idempotency_keys WHERE created_at < NOW() - INTERVAL '24 hours';
