-- Add whatsapp_reminder to the notification_type enum
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'whatsapp_reminder';

-- Add scheduled_for column to notifications for future-dated reminders
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_reminder_fired BOOLEAN DEFAULT false;

-- Index for efficient reminder polling
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_reminder
  ON public.notifications (scheduled_for, is_reminder_fired)
  WHERE scheduled_for IS NOT NULL AND is_reminder_fired = false;

-- Add whatsapp_conversations to realtime publication if not already there
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'whatsapp_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
  END IF;
END $$;
