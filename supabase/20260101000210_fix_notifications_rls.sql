-- Fix notifications RLS policies if needed
-- Run this if notifications aren't showing up

-- Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'notifications';

-- Drop and recreate policies to ensure they work correctly
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications for company users" ON public.notifications;
DROP POLICY IF EXISTS "Users can mark their own notifications as read" ON public.notifications;

-- Recreate policies with proper permissions
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "System can create notifications for company users"
ON public.notifications FOR INSERT
WITH CHECK (true);  -- Allow system to create notifications

CREATE POLICY "Users can mark their own notifications as read"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
