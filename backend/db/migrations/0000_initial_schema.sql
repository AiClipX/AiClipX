-- Migration: 0000_initial_schema
-- Description: Create video_tasks table with base columns
-- Created: 2026-01-07

CREATE TABLE IF NOT EXISTS video_tasks (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(500),
    prompt TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    video_url TEXT,
    error_message TEXT
);
