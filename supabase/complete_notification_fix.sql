-- Complete notification fix - disable RLS temporarily to test
-- Then we'll implement proper policies

-- Check current policies
SELECT 'Current policies:' as status;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'notifications';

-- Temporarily disable RLS completely for testing
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- Test notification creation now
SELECT 'RLS disabled - try creating a notification now' as status;

-- After testing, re-enable RLS and apply working policies:
-- ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS "users_can_read_own_notifications" ON public.notifications;
-- DROP POLICY IF EXISTS "authenticated_users_can_create_notifications" ON public.notifications;
-- DROP POLICY IF EXISTS "users_can_update_own_notifications" ON public.notifications;
--
-- CREATE POLICY "users_can_read_own_notifications"
-- ON public.notifications FOR SELECT
-- USING (user_id = auth.uid());
--
-- CREATE POLICY "allow_all_authenticated_inserts"
-- ON public.notifications FOR INSERT
-- WITH CHECK (auth.role() = 'authenticated');
--
-- CREATE POLICY "users_can_update_own_notifications"
-- ON public.notifications FOR UPDATE
-- USING (user_id = auth.uid());
