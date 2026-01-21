-- Migration: Create notifications table with RLS and realtime
-- Run this in Supabase SQL Editor

-- Create notification type enum
DROP TYPE IF EXISTS public.notification_type CASCADE;
CREATE TYPE public.notification_type AS ENUM (
  'task_assigned',
  'task_completed',
  'task_overdue',
  'follow_up_reminder',
  'system_alert'
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_id UUID,
  read BOOLEAN NOT NULL DEFAULT false,
  company_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON public.notifications(user_id, read, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (simple and permissive for reliability)
CREATE POLICY "users_can_read_own_notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "authenticated_users_can_create_notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "users_can_update_own_notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

-- Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Grant necessary permissions
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO anon;
