-- Support Tickets (multi-tenant) with RLS + realtime
-- Tables:
--  - support_tickets
--  - support_ticket_messages
--  - support_ticket_internal_notes

-- Enums
DROP TYPE IF EXISTS public.support_ticket_status CASCADE;
CREATE TYPE public.support_ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

DROP TYPE IF EXISTS public.support_ticket_priority CASCADE;
CREATE TYPE public.support_ticket_priority AS ENUM ('low', 'medium', 'high');

DROP TYPE IF EXISTS public.support_ticket_category CASCADE;
CREATE TYPE public.support_ticket_category AS ENUM ('bug', 'feature_request', 'help', 'integration');

DROP TYPE IF EXISTS public.support_ticket_sender_type CASCADE;
CREATE TYPE public.support_ticket_sender_type AS ENUM ('client', 'admin');

-- Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  industry_type public.industry_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status public.support_ticket_status NOT NULL DEFAULT 'open',
  priority public.support_ticket_priority NOT NULL DEFAULT 'medium',
  category public.support_ticket_category NOT NULL,
  assigned_to UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_company_id ON public.support_tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_updated_at ON public.support_tickets(updated_at DESC);

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Messages (client + admin replies)
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type public.support_ticket_sender_type NOT NULL,
  sender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON public.support_ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_created_at ON public.support_ticket_messages(created_at DESC);

ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Internal notes (admin-only; never shown to clients)
CREATE TABLE IF NOT EXISTS public.support_ticket_internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_internal_notes_ticket_id ON public.support_ticket_internal_notes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_internal_notes_created_at ON public.support_ticket_internal_notes(created_at DESC);

ALTER TABLE public.support_ticket_internal_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Ticket visibility:
--  - clients can read ONLY their own tickets
--  - company admins/managers can read all tickets in their company
--  - super_admin can read all tickets across tenants
CREATE POLICY "support_tickets_select"
ON public.support_tickets FOR SELECT
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR (
    company_id = public.get_user_company_id(auth.uid())
    AND (
      user_id = auth.uid()
      OR public.has_role_level(auth.uid(), 'admin')
    )
  )
);

-- Ticket creation: clients can create tickets only in their own company, for themselves.
CREATE POLICY "support_tickets_insert_client"
ON public.support_tickets FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND company_id = public.get_user_company_id(auth.uid())
  AND industry_type = (
    SELECT c.industry
    FROM public.companies c
    WHERE c.id = public.get_user_company_id(auth.uid())
  )
);

-- Ticket updates: only admins/managers/super_admin (status + assignment + etc)
CREATE POLICY "support_tickets_update_admin"
ON public.support_tickets FOR UPDATE
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR (
    company_id = public.get_user_company_id(auth.uid())
    AND public.has_role_level(auth.uid(), 'admin')
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR (
    company_id = public.get_user_company_id(auth.uid())
    AND public.has_role_level(auth.uid(), 'admin')
  )
);

-- Messages visibility:
--  - clients can read messages only for their own tickets
--  - company admins/managers can read all messages in their company
--  - super_admin can read all messages
CREATE POLICY "support_ticket_messages_select"
ON public.support_ticket_messages FOR SELECT
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR EXISTS (
    SELECT 1
    FROM public.support_tickets t
    WHERE t.id = ticket_id
      AND t.company_id = public.get_user_company_id(auth.uid())
      AND (
        t.user_id = auth.uid()
        OR public.has_role_level(auth.uid(), 'admin')
      )
  )
);

-- Messages insertion:
--  - client replies are sender_type='client' and must belong to the ticket owner
--  - admin replies are sender_type='admin' and must be from an admin user
CREATE POLICY "support_ticket_messages_insert"
ON public.support_ticket_messages FOR INSERT
WITH CHECK (
  sender_user_id = auth.uid()
  AND (
    (
      sender_type = 'client'
      AND EXISTS (
        SELECT 1
        FROM public.support_tickets t
        WHERE t.id = ticket_id
          AND t.company_id = public.get_user_company_id(auth.uid())
          AND t.user_id = auth.uid()
      )
    )
    OR
    (
      sender_type = 'admin'
      AND (
        public.has_role(auth.uid(), 'super_admin')
        OR (
          public.has_role_level(auth.uid(), 'admin')
          AND EXISTS (
            SELECT 1
            FROM public.support_tickets t
            WHERE t.id = ticket_id
              AND t.company_id = public.get_user_company_id(auth.uid())
          )
        )
      )
    )
  )
);

-- Internal notes visibility (admin only)
CREATE POLICY "support_ticket_internal_notes_select_admin"
ON public.support_ticket_internal_notes FOR SELECT
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR (
    EXISTS (
      SELECT 1
      FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND t.company_id = public.get_user_company_id(auth.uid())
    )
    AND public.has_role_level(auth.uid(), 'admin')
  )
);

CREATE POLICY "support_ticket_internal_notes_insert_admin"
ON public.support_ticket_internal_notes FOR INSERT
WITH CHECK (
  admin_user_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role_level(auth.uid(), 'admin')
      AND EXISTS (
        SELECT 1
        FROM public.support_tickets t
        WHERE t.id = ticket_id
          AND t.company_id = public.get_user_company_id(auth.uid())
      )
    )
  )
);

-- Grants
GRANT SELECT, INSERT ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT ON public.support_ticket_messages TO authenticated;
GRANT SELECT, INSERT ON public.support_ticket_internal_notes TO authenticated;

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_internal_notes;

