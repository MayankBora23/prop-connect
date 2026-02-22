-- Add internal_crm to industry_type enum
-- Note: In Supabase/PostgreSQL, we can't easily add enum values in a transaction with other commands
-- but we can try it. If it fails, we might need a separate migration.
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'internal_crm';

-- Helper function to check if a user belongs to an internal CRM company
CREATE OR REPLACE FUNCTION public.is_internal_crm_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.companies c ON p.company_id = c.id
    WHERE p.user_id = _user_id
      AND c.industry = 'internal_crm'
  );
$$;

-- Update RLS policies for companies
DROP POLICY IF EXISTS "Internal CRM users can view all companies" ON public.companies;
CREATE POLICY "Internal CRM users can view all companies"
ON public.companies FOR SELECT
USING (public.is_internal_crm_user(auth.uid()));

DROP POLICY IF EXISTS "Internal CRM users can update all companies" ON public.companies;
CREATE POLICY "Internal CRM users can update all companies"
ON public.companies FOR UPDATE
USING (public.is_internal_crm_user(auth.uid()));

-- Update RLS policies for profiles
DROP POLICY IF EXISTS "Internal CRM users can view all profiles" ON public.profiles;
CREATE POLICY "Internal CRM users can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_internal_crm_user(auth.uid()));

-- Update RLS policies for user_roles
DROP POLICY IF EXISTS "Internal CRM users can view all roles" ON public.user_roles;
CREATE POLICY "Internal CRM users can view all roles"
ON public.user_roles FOR SELECT
USING (public.is_internal_crm_user(auth.uid()));
