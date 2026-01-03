-- Check notifications table and policies
-- Run this to debug notification issues

-- Check if notifications table exists
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'notifications';

-- Check current RLS policies on notifications table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'notifications';

-- Check recent notifications (last 10)
SELECT id, user_id, type, title, message, read, company_id, created_at
FROM public.notifications
ORDER BY created_at DESC
LIMIT 10;

-- Check if current user has notifications
SELECT n.id, n.user_id, n.type, n.title, n.message, n.read, n.company_id, n.created_at,
       p.name as user_name, c.name as company_name
FROM public.notifications n
LEFT JOIN public.profiles p ON n.user_id = p.user_id
LEFT JOIN public.companies c ON n.company_id = c.id
ORDER BY n.created_at DESC
LIMIT 10;
