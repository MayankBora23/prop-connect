-- Lead interaction history: table, validation trigger, RLS, realtime

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'lead_entity'
  ) THEN
    CREATE TYPE public.lead_entity AS ENUM (
      'leads',
      'auto_leads',
      'students',
      'internal_leads'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.lead_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  lead_entity public.lead_entity NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles (user_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  interaction_type text NOT NULL,
  message text NOT NULL,
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  visibility text NOT NULL DEFAULT 'team' CHECK (visibility IN ('team', 'private')),
  CONSTRAINT lead_history_interaction_type_nonempty CHECK (length(trim(interaction_type)) > 0),
  CONSTRAINT lead_history_message_nonempty CHECK (length(trim(message)) > 0)
);

COMMENT ON TABLE public.lead_history IS 'Chat-style interaction log per CRM lead (all verticals).';
COMMENT ON COLUMN public.lead_history.lead_entity IS 'Which table lead_id refers to.';
COMMENT ON COLUMN public.lead_history.visibility IS 'team: visible to colleagues (same company); private: author + managers/admins only.';

CREATE INDEX IF NOT EXISTS idx_lead_history_lead ON public.lead_history (lead_entity, lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_history_company_created ON public.lead_history (company_id, created_at DESC);

-- Validate lead exists, company alignment, and force created_by = auth.uid()
CREATE OR REPLACE FUNCTION public.lead_history_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  expected_company uuid := public.get_user_company_id(uid);
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NEW.company_id IS DISTINCT FROM expected_company THEN
    RAISE EXCEPTION 'company_id must match your organization';
  END IF;

  NEW.created_by := uid;

  IF NEW.lead_entity = 'leads' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = NEW.lead_id AND l.company_id = NEW.company_id
    ) THEN
      RAISE EXCEPTION 'Lead not found or company mismatch';
    END IF;
  ELSIF NEW.lead_entity = 'auto_leads' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.auto_leads a
      WHERE a.id = NEW.lead_id AND a.company_id = NEW.company_id
    ) THEN
      RAISE EXCEPTION 'Auto lead not found or company mismatch';
    END IF;
  ELSIF NEW.lead_entity = 'students' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = NEW.lead_id AND s.company_id = NEW.company_id
    ) THEN
      RAISE EXCEPTION 'Student not found or company mismatch';
    END IF;
  ELSIF NEW.lead_entity = 'internal_leads' THEN
    IF NOT (public.is_internal_crm_user(uid) OR public.has_role(uid, 'super_admin')) THEN
      RAISE EXCEPTION 'Only internal CRM users can log internal lead history';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.internal_leads il WHERE il.id = NEW.lead_id) THEN
      RAISE EXCEPTION 'Internal lead not found';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid lead_entity';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lead_history_before_insert ON public.lead_history;
CREATE TRIGGER trg_lead_history_before_insert
BEFORE INSERT ON public.lead_history
FOR EACH ROW
EXECUTE FUNCTION public.lead_history_before_insert();

ALTER TABLE public.lead_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_history_select_company" ON public.lead_history;
DROP POLICY IF EXISTS "lead_history_insert_company" ON public.lead_history;

CREATE POLICY "lead_history_select_company"
ON public.lead_history
FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND (
    public.has_role_level(auth.uid(), 'manager')
    OR visibility = 'team'
    OR created_by = auth.uid()
  )
);

CREATE POLICY "lead_history_insert_company"
ON public.lead_history
FOR INSERT
TO authenticated
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

GRANT SELECT, INSERT ON public.lead_history TO authenticated;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_history;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
