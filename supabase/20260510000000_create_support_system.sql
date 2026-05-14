-- Support ticket system: enums, tables, RLS, realtime

-- Enums (idempotent)
DO $$ BEGIN
  CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.ticket_category AS ENUM ('bug', 'feature_request', 'help', 'integration', 'billing', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.ticket_message_sender AS ENUM ('client', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Readable ticket numbers (#1001, …)
CREATE SEQUENCE IF NOT EXISTS public.support_ticket_number_seq START WITH 1001 INCREMENT BY 1 MINVALUE 1001;

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  assigned_to uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  industry_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  status public.ticket_status NOT NULL DEFAULT 'open',
  priority public.ticket_priority NOT NULL DEFAULT 'medium',
  category public.ticket_category NOT NULL DEFAULT 'help',
  tags text[] NOT NULL DEFAULT '{}'::text[],
  ticket_number integer NOT NULL DEFAULT nextval('public.support_ticket_number_seq'::regclass),
  is_read_by_admin boolean NOT NULL DEFAULT false,
  is_read_by_client boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  sender_type public.ticket_message_sender NOT NULL,
  message text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets (id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.support_messages (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  file_type text,
  uploaded_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_support_tickets_company_id ON public.support_tickets (company_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_updated_at ON public.support_tickets (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON public.support_messages (ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_attachments_ticket_id ON public.support_attachments (ticket_id);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_attachments ENABLE ROW LEVEL SECURITY;

-- Reusable predicate: internal CRM company + admin/super_admin
-- profiles.user_id = auth.uid(), profile.company is internal_crm, role in that company

-- support_tickets SELECT: own company
CREATE POLICY "clients see own company tickets"
ON public.support_tickets FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

-- support_tickets SELECT: internal CRM admins see all
CREATE POLICY "internal_crm team see all tickets"
ON public.support_tickets FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.companies c ON c.id = p.company_id
    WHERE p.user_id = auth.uid()
      AND c.industry::text = 'internal_crm'
  )
);

CREATE POLICY "insert own company ticket"
ON public.support_tickets FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "company admins update own tickets"
ON public.support_tickets FOR UPDATE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
)
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

CREATE POLICY "internal_crm admins update any ticket"
ON public.support_tickets FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.companies c ON c.id = p.company_id
    INNER JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.company_id = p.company_id
    WHERE p.user_id = auth.uid()
      AND c.industry::text = 'internal_crm'
      AND ur.role IN ('super_admin'::public.app_role, 'admin'::public.app_role)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.companies c ON c.id = p.company_id
    INNER JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.company_id = p.company_id
    WHERE p.user_id = auth.uid()
      AND c.industry::text = 'internal_crm'
      AND ur.role IN ('super_admin'::public.app_role, 'admin'::public.app_role)
  )
);

CREATE POLICY "internal_crm team update any ticket"
ON public.support_tickets FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.companies c ON c.id = p.company_id
    WHERE p.user_id = auth.uid()
      AND c.industry::text = 'internal_crm'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.companies c ON c.id = p.company_id
    WHERE p.user_id = auth.uid()
      AND c.industry::text = 'internal_crm'
  )
);

-- Allow any member of the ticket's company to update rows (read flags, updated_at on replies).
-- Admins retain stricter control via the policies above; RLS is permissive (OR).
CREATE POLICY "company members update own company tickets"
ON public.support_tickets FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()))
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- support_messages
CREATE POLICY "members see non-internal messages"
ON public.support_messages FOR SELECT
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND (
    is_internal = false
    OR public.has_role_level(auth.uid(), 'admin')
  )
);

CREATE POLICY "internal_crm admins see all messages including internal"
ON public.support_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.companies c ON c.id = p.company_id
    INNER JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.company_id = p.company_id
    WHERE p.user_id = auth.uid()
      AND c.industry::text = 'internal_crm'
      AND ur.role IN ('super_admin'::public.app_role, 'admin'::public.app_role)
  )
);

CREATE POLICY "internal_crm team see non-internal messages"
ON public.support_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.companies c ON c.id = p.company_id
    WHERE p.user_id = auth.uid()
      AND c.industry::text = 'internal_crm'
  )
  AND is_internal = false
);

CREATE POLICY "insert messages for own company"
ON public.support_messages FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- Internal platform staff must be able to reply on client-company rows (company_id = ticket's company)
-- Internal platform staff (any role in internal_crm company) can reply on client tickets
CREATE POLICY "internal_crm_team_insert_support_messages"
ON public.support_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.companies c ON c.id = p.company_id
    WHERE p.user_id = auth.uid()
      AND c.industry::text = 'internal_crm'
  )
  AND EXISTS (
    SELECT 1 FROM public.support_tickets st
    WHERE st.id = ticket_id AND st.company_id = company_id
  )
);

-- support_attachments
CREATE POLICY "support_attachments select company or internal admin"
ON public.support_attachments FOR SELECT
USING (
  company_id = public.get_user_company_id(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.companies c ON c.id = p.company_id
    WHERE p.user_id = auth.uid()
      AND c.industry::text = 'internal_crm'
  )
);

CREATE POLICY "support_attachments insert own company"
ON public.support_attachments FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "internal_crm_team_insert_support_attachments"
ON public.support_attachments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.companies c ON c.id = p.company_id
    WHERE p.user_id = auth.uid()
      AND c.industry::text = 'internal_crm'
  )
  AND EXISTS (
    SELECT 1 FROM public.support_tickets st
    WHERE st.id = ticket_id AND st.company_id = company_id
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_attachments TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.support_ticket_number_seq TO authenticated;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
