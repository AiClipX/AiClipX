-- BE-STG13-016: Allow NULL task_id for atomic lock acquisition
-- Run this in Supabase SQL Editor

-- Allow task_id to be NULL (lock acquired but task not yet created)
ALTER TABLE idempotency_keys ALTER COLUMN task_id DROP NOT NULL;

-- Add comment explaining the state
COMMENT ON COLUMN idempotency_keys.task_id IS 
  'NULL = lock acquired, task creation in progress. Non-NULL = task created successfully.';
