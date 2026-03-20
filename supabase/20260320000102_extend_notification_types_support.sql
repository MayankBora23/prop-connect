-- Extend notifications enum for support-ticket events

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type t WHERE t.typname = 'notification_type') THEN
    -- ticket_created
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = 'public.notification_type'::regtype
        AND enumlabel = 'ticket_created'
    ) THEN
      ALTER TYPE public.notification_type ADD VALUE 'ticket_created';
    END IF;

    -- ticket_replied
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = 'public.notification_type'::regtype
        AND enumlabel = 'ticket_replied'
    ) THEN
      ALTER TYPE public.notification_type ADD VALUE 'ticket_replied';
    END IF;

    -- ticket_status_changed
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = 'public.notification_type'::regtype
        AND enumlabel = 'ticket_status_changed'
    ) THEN
      ALTER TYPE public.notification_type ADD VALUE 'ticket_status_changed';
    END IF;
  END IF;
END $$;

