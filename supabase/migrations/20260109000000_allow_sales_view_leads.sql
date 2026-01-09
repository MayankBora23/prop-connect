-- Migration: Allow all company users (including 'sales') to view leads
-- Drops the restrictive leads SELECT policy and replaces it with a company-scoped policy.
BEGIN;

-- Remove existing restrictive policy
DROP POLICY IF EXISTS "Users can view leads in their company" ON public.leads;

-- Allow any authenticated user in the same company to SELECT leads
CREATE POLICY "Users can view leads in their company"
ON public.leads FOR SELECT
USING (
  company_id = public.get_user_company_id(auth.uid())
);

COMMIT;

