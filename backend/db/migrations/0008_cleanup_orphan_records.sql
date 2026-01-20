-- Migration: 0008_cleanup_orphan_records
-- Description: BE-AUTH-001 - Delete records without user_id (migration cleanup)
-- Created: 2026-01-07
-- WARNING: This is a destructive migration - removes orphan data

DELETE FROM video_tasks WHERE user_id IS NULL;
DELETE FROM tts_requests WHERE user_id IS NULL;
