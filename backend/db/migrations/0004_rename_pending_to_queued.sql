-- Migration: 0004_rename_pending_to_queued
-- Description: Rename status 'pending' to 'queued' for consistency
-- Created: 2026-01-07

UPDATE video_tasks SET status = 'queued' WHERE status = 'pending';
