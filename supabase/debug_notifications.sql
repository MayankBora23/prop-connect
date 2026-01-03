-- Debug notification creation issues
-- Run this to check what's preventing notifications from being created

-- Check current RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'notifications';

-- Test manual notification creation (replace with real IDs)
-- First, get a user_id and company_id from your database
SELECT user_id, company_id FROM profiles LIMIT 1;

-- Then create a test notification (replace USER_ID and COMPANY_ID)
-- INSERT INTO public.notifications (user_id, type, title, message, company_id, read)
-- VALUES ('USER_ID', 'task_assigned', 'Test Notification', 'Test message', 'COMPANY_ID', false);

-- Check if the insert worked
SELECT COUNT(*) as notification_count FROM public.notifications;

-- Check RLS settings
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'notifications';
