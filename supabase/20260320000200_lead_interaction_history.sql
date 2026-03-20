-- Lead History / Interaction Timeline
-- Multi-tenant + RLS + realtime (Supabase Realtime)

-- 0) Interaction Type Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_history_interaction_type') THEN
    CREATE TYPE public.lead_history_interaction_type AS ENUM (
      'call',
      'whatsapp',
      'meeting',
      'note',
      -- Real Estate
      'site_visit',
      'booking_discussion',
      -- Coaching/Education
      'demo_class',
      'fee_discussion',
      -- Auto Dealers
      'test_drive',
      'price_negotiation'
    );
  END IF;
END $$;

-- Helper: add table to realtime publication if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'lead_history'
  ) THEN
    -- no-op; handled per table below
    NULL;
  END IF;
END $$;

-- 1) Real Estate Lead History
CREATE TABLE IF NOT EXISTS public.lead_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  industry_type public.industry_type NOT NULL,
  interaction_type public.lead_history_interaction_type NOT NULL,
  message TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_lead_history_company_id ON public.lead_history(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_history_lead_id ON public.lead_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_history_created_at ON public.lead_history(created_at DESC);

ALTER TABLE public.lead_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_history_select" ON public.lead_history;
CREATE POLICY "lead_history_select"
ON public.lead_history FOR SELECT
TO authenticated
USING (
  public.is_internal_crm_user(auth.uid())
  OR company_id = public.get_user_company_id(auth.uid())
);

DROP POLICY IF EXISTS "lead_history_insert" ON public.lead_history;
CREATE POLICY "lead_history_insert"
ON public.lead_history FOR INSERT
TO authenticated
WITH CHECK (
  (public.is_internal_crm_user(auth.uid()) OR company_id = public.get_user_company_id(auth.uid()))
  AND EXISTS (
    SELECT 1
    FROM public.leads l
    WHERE l.id = lead_id
      AND l.company_id = company_id
  )
);

GRANT SELECT, INSERT ON public.lead_history TO authenticated;

-- 2) Automobile Lead History
CREATE TABLE IF NOT EXISTS public.auto_lead_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  auto_lead_id UUID NOT NULL REFERENCES public.auto_leads(id) ON DELETE CASCADE,
  industry_type public.industry_type NOT NULL,
  interaction_type public.lead_history_interaction_type NOT NULL,
  message TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_auto_lead_history_company_id ON public.auto_lead_history(company_id);
CREATE INDEX IF NOT EXISTS idx_auto_lead_history_auto_lead_id ON public.auto_lead_history(auto_lead_id);
CREATE INDEX IF NOT EXISTS idx_auto_lead_history_created_at ON public.auto_lead_history(created_at DESC);

ALTER TABLE public.auto_lead_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auto_lead_history_select" ON public.auto_lead_history;
CREATE POLICY "auto_lead_history_select"
ON public.auto_lead_history FOR SELECT
TO authenticated
USING (
  public.is_internal_crm_user(auth.uid())
  OR company_id = public.get_user_company_id(auth.uid())
);

DROP POLICY IF EXISTS "auto_lead_history_insert" ON public.auto_lead_history;
CREATE POLICY "auto_lead_history_insert"
ON public.auto_lead_history FOR INSERT
TO authenticated
WITH CHECK (
  (public.is_internal_crm_user(auth.uid()) OR company_id = public.get_user_company_id(auth.uid()))
  AND EXISTS (
    SELECT 1
    FROM public.auto_leads a
    WHERE a.id = auto_lead_id
      AND a.company_id = company_id
  )
);

GRANT SELECT, INSERT ON public.auto_lead_history TO authenticated;

-- 3) Education/Coaching Student History
CREATE TABLE IF NOT EXISTS public.student_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  industry_type public.industry_type NOT NULL,
  interaction_type public.lead_history_interaction_type NOT NULL,
  message TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_student_history_company_id ON public.student_history(company_id);
CREATE INDEX IF NOT EXISTS idx_student_history_student_id ON public.student_history(student_id);
CREATE INDEX IF NOT EXISTS idx_student_history_created_at ON public.student_history(created_at DESC);

ALTER TABLE public.student_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_history_select" ON public.student_history;
CREATE POLICY "student_history_select"
ON public.student_history FOR SELECT
TO authenticated
USING (
  public.is_internal_crm_user(auth.uid())
  OR company_id = public.get_user_company_id(auth.uid())
);

DROP POLICY IF EXISTS "student_history_insert" ON public.student_history;
CREATE POLICY "student_history_insert"
ON public.student_history FOR INSERT
TO authenticated
WITH CHECK (
  (public.is_internal_crm_user(auth.uid()) OR company_id = public.get_user_company_id(auth.uid()))
  AND EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = student_id
      AND s.company_id = company_id
  )
);

GRANT SELECT, INSERT ON public.student_history TO authenticated;

-- 4) Internal CRM Lead History (internal_leads are global, but history is still tied to internal_crm company)
CREATE TABLE IF NOT EXISTS public.internal_lead_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  internal_lead_id UUID NOT NULL REFERENCES public.internal_leads(id) ON DELETE CASCADE,
  industry_type public.industry_type NOT NULL DEFAULT 'internal_crm'::public.industry_type,
  interaction_type public.lead_history_interaction_type NOT NULL,
  message TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_internal_lead_history_company_id ON public.internal_lead_history(company_id);
CREATE INDEX IF NOT EXISTS idx_internal_lead_history_internal_lead_id ON public.internal_lead_history(internal_lead_id);
CREATE INDEX IF NOT EXISTS idx_internal_lead_history_created_at ON public.internal_lead_history(created_at DESC);

ALTER TABLE public.internal_lead_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "internal_lead_history_select" ON public.internal_lead_history;
CREATE POLICY "internal_lead_history_select"
ON public.internal_lead_history FOR SELECT
TO authenticated
USING (
  public.is_internal_crm_user(auth.uid())
  OR company_id = public.get_user_company_id(auth.uid())
);

DROP POLICY IF EXISTS "internal_lead_history_insert" ON public.internal_lead_history;
CREATE POLICY "internal_lead_history_insert"
ON public.internal_lead_history FOR INSERT
TO authenticated
WITH CHECK (
  (public.is_internal_crm_user(auth.uid()) OR company_id = public.get_user_company_id(auth.uid()))
  AND EXISTS (
    SELECT 1
    FROM public.internal_leads il
    WHERE il.id = internal_lead_id
  )
);

GRANT SELECT, INSERT ON public.internal_lead_history TO authenticated;

-- 5) Enable realtime for history tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'lead_history'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_history';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'auto_lead_history'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.auto_lead_history';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'student_history'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.student_history';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'internal_lead_history'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_lead_history';
  END IF;
END $$;

