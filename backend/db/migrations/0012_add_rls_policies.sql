-- Migration: 0012_add_rls_policies
-- Description: BE-AUTH-001 - Create RLS policies using auth.uid()
-- Created: 2026-01-07

-- Drop old permissive policies if exist
DROP POLICY IF EXISTS service_role_all_video_tasks ON video_tasks;
DROP POLICY IF EXISTS service_role_all_tts_requests ON tts_requests;

-- video_tasks policies
DROP POLICY IF EXISTS user_select_video_tasks ON video_tasks;
CREATE POLICY user_select_video_tasks ON video_tasks
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_insert_video_tasks ON video_tasks;
CREATE POLICY user_insert_video_tasks ON video_tasks
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_update_video_tasks ON video_tasks;
CREATE POLICY user_update_video_tasks ON video_tasks
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_delete_video_tasks ON video_tasks;
CREATE POLICY user_delete_video_tasks ON video_tasks
    FOR DELETE USING (user_id = auth.uid());

-- tts_requests policies
DROP POLICY IF EXISTS user_select_tts_requests ON tts_requests;
CREATE POLICY user_select_tts_requests ON tts_requests
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_insert_tts_requests ON tts_requests;
CREATE POLICY user_insert_tts_requests ON tts_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());
