-- Test notification creation
-- Run this to test if notifications can be created

-- Temporarily disable RLS to test
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- Get test data
SELECT 'Test data - user_id and company_id:' as info;
SELECT user_id, company_id FROM profiles LIMIT 1;

-- Create test notification (replace with actual IDs from above query)
-- Uncomment and modify the IDs below:
-- INSERT INTO public.notifications (user_id, type, title, message, company_id, read)
-- VALUES ('your_user_id_here', 'task_assigned', 'Test Notification', 'This is a test', 'your_company_id_here', false);

-- Check if notification was created
SELECT * FROM public.notifications ORDER BY created_at DESC LIMIT 1;

-- Re-enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
