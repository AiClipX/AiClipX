-- Migration: 0006_add_tts_indexes
-- Description: Add indexes for tts_requests table
-- Created: 2026-01-07

CREATE INDEX IF NOT EXISTS idx_tts_requests_created_at ON tts_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tts_requests_voice ON tts_requests(voice);
