-- Complete recreation of notifications system
-- This will delete everything and start fresh

-- STEP 1: Clean up existing notifications setup
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TYPE IF EXISTS public.notification_type CASCADE;

-- Remove from realtime publication if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
  END IF;
EXCEPTION WHEN undefined_table THEN
  -- Ignore if publication doesn't exist
END $$;

-- STEP 2: Create notification type enum
CREATE TYPE public.notification_type AS ENUM (
  'task_assigned',
  'task_completed',
  'task_overdue',
  'follow_up_reminder',
  'system_alert'
);

-- STEP 3: Create notifications table
CREATE TABLE public.notifications (
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

-- STEP 4: Create indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX idx_notifications_user_read_created ON public.notifications(user_id, read, created_at DESC);

-- STEP 5: Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- STEP 6: Create RLS policies (simple and permissive)
CREATE POLICY "users_can_read_own_notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "authenticated_users_can_create_notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "users_can_update_own_notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

-- STEP 7: Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- STEP 8: Grant necessary permissions
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO anon;

-- STEP 9: Verify everything is set up correctly
SELECT 'Notifications table recreated successfully!' as status;

-- Check table exists
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'notifications';

-- Check policies are applied
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'notifications';

-- Check realtime is enabled
SELECT pubname, schemaname, tablename
FROM pg_publication_tables
WHERE tablename = 'notifications';
