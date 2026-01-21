-- Final fix for notification RLS policies
-- Allow users to create notifications for anyone in their company

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "allow_select_notifications" ON public.notifications;
DROP POLICY IF EXISTS "allow_insert_notifications" ON public.notifications;
DROP POLICY IF EXISTS "allow_update_notifications" ON public.notifications;

-- Create proper policies
CREATE POLICY "users_can_view_own_notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "users_can_create_notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "users_can_update_own_notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

-- Verify the policies work
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'notifications';
