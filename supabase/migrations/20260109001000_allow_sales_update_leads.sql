-- Migration: Allow 'sales' role to update leads (bring parity with other industries)
-- This adds a permissive UPDATE policy for sales users within their company,
-- while retaining the existing manager/assigned restriction policy.
BEGIN;

-- Drop old generic update policy if present
DROP POLICY IF EXISTS "Users can update leads" ON public.leads;

-- Manager / assigned policy (keeps existing stricter rule)
CREATE POLICY "Managers or assignees can update leads"
ON public.leads FOR UPDATE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND (
    public.has_role_level(auth.uid(), 'manager')
    OR assigned_to = auth.uid()
  )
)
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid())
);

-- Sales policy: allow sales role to update leads within same company
CREATE POLICY "Sales can update leads in their company"
ON public.leads FOR UPDATE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role(auth.uid(), 'sales')
)
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid())
);

COMMIT;

