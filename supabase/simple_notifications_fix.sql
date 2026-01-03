-- Simple fix for notification issues
-- Run this in Supabase SQL Editor

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications for company users" ON public.notifications;
DROP POLICY IF EXISTS "Users can mark their own notifications as read" ON public.notifications;
DROP POLICY IF EXISTS "users_select_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "allow_all_inserts" ON public.notifications;
DROP POLICY IF EXISTS "users_update_own_notifications" ON public.notifications;

-- Create simple, permissive policies for testing
CREATE POLICY "allow_select_notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "allow_insert_notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);  -- Allow anyone to insert notifications for now

CREATE POLICY "allow_update_notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

-- Test notification creation
-- Get a user_id and company_id for testing
SELECT 'Test data:' as info;
SELECT user_id, company_id FROM profiles WHERE company_id IS NOT NULL LIMIT 1;
