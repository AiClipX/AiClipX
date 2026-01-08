-- Migration: 0011_enable_rls
-- Description: BE-ENGINE-002 - Enable Row Level Security for Supabase compliance
-- Created: 2026-01-07

ALTER TABLE video_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tts_requests ENABLE ROW LEVEL SECURITY;
