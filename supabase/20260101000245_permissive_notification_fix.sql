-- Completely permissive notification policies for testing
-- This will allow all authenticated users to create/read/update notifications

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "users_can_view_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "users_can_create_notifications" ON public.notifications;
DROP POLICY IF EXISTS "users_can_update_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "allow_select_notifications" ON public.notifications;
DROP POLICY IF EXISTS "allow_insert_notifications" ON public.notifications;
DROP POLICY IF EXISTS "allow_update_notifications" ON public.notifications;

-- Create maximally permissive policies
CREATE POLICY "allow_everything_notifications"
ON public.notifications FOR ALL
USING (true)
WITH CHECK (true);

-- Verify policies are applied
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'notifications';
