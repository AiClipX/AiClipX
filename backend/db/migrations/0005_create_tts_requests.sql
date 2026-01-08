-- Migration: 0005_create_tts_requests
-- Description: BE-DB-PERSIST-001 - Create tts_requests table
-- Created: 2026-01-07

CREATE TABLE IF NOT EXISTS tts_requests (
    id VARCHAR(50) PRIMARY KEY,
    request_id VARCHAR(50),
    locale VARCHAR(20),
    voice VARCHAR(100),
    text_len INTEGER,
    ssml TEXT,
    audio_url TEXT NOT NULL,
    bytes INTEGER NOT NULL,
    format VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
