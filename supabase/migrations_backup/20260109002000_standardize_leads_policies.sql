-- Migration: Standardize leads RLS policies to match education-style company-scoped policies
-- Makes SELECT/INSERT/UPDATE policies simple company-scoped checks so roles behave same across industries.
BEGIN;

-- Drop any existing leads policies that might be restrictive or duplicate
DROP POLICY IF EXISTS "Users can view leads in their company" ON public.leads;
DROP POLICY IF EXISTS "Users can create leads in their company" ON public.leads;
DROP POLICY IF EXISTS "Users can update leads" ON public.leads;
DROP POLICY IF EXISTS "Managers or assignees can update leads" ON public.leads;
DROP POLICY IF EXISTS "Sales can update leads in their company" ON public.leads;

-- SELECT: allow any user in the same company to view leads (education-style)
CREATE POLICY "Users can view leads in their company"
ON public.leads FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

-- INSERT: allow any user in the same company to create leads
CREATE POLICY "Users can create leads in their company"
ON public.leads FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- UPDATE: allow any user in the same company to update leads (matches education tables)
CREATE POLICY "Users can update leads in their company"
ON public.leads FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()))
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

COMMIT;

