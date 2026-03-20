-- Tighten Lead History RLS to enforce same-company access only

-- Real estate lead_history
DROP POLICY IF EXISTS "lead_history_select" ON public.lead_history;
CREATE POLICY "lead_history_select"
ON public.lead_history FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
);

DROP POLICY IF EXISTS "lead_history_insert" ON public.lead_history;
CREATE POLICY "lead_history_insert"
ON public.lead_history FOR INSERT
TO authenticated
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.leads l
    WHERE l.id = lead_id
      AND l.company_id = company_id
  )
);

-- Automobile auto_lead_history
DROP POLICY IF EXISTS "auto_lead_history_select" ON public.auto_lead_history;
CREATE POLICY "auto_lead_history_select"
ON public.auto_lead_history FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
);

DROP POLICY IF EXISTS "auto_lead_history_insert" ON public.auto_lead_history;
CREATE POLICY "auto_lead_history_insert"
ON public.auto_lead_history FOR INSERT
TO authenticated
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.auto_leads a
    WHERE a.id = auto_lead_id
      AND a.company_id = company_id
  )
);

-- Education student_history
DROP POLICY IF EXISTS "student_history_select" ON public.student_history;
CREATE POLICY "student_history_select"
ON public.student_history FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
);

DROP POLICY IF EXISTS "student_history_insert" ON public.student_history;
CREATE POLICY "student_history_insert"
ON public.student_history FOR INSERT
TO authenticated
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = student_id
      AND s.company_id = company_id
  )
);

-- Internal CRM internal_lead_history
DROP POLICY IF EXISTS "internal_lead_history_select" ON public.internal_lead_history;
CREATE POLICY "internal_lead_history_select"
ON public.internal_lead_history FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
);

DROP POLICY IF EXISTS "internal_lead_history_insert" ON public.internal_lead_history;
CREATE POLICY "internal_lead_history_insert"
ON public.internal_lead_history FOR INSERT
TO authenticated
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.internal_leads il
    WHERE il.id = internal_lead_id
  )
);

