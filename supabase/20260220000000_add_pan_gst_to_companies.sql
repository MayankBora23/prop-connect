-- Migration: Add pan_number and gst_number columns to companies table
-- Also update RLS policies to allow UPDATE and DELETE for internal_crm users

-- 1) Add pan_number and gst_number columns to companies table
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS pan_number TEXT,
ADD COLUMN IF NOT EXISTS gst_number TEXT;

-- 2) Add comments for documentation
COMMENT ON COLUMN public.companies.pan_number IS 'PAN (Permanent Account Number) for the company';
COMMENT ON COLUMN public.companies.gst_number IS 'GST (Goods and Services Tax) number for the company';

-- 3) Update RLS policies to allow UPDATE and DELETE for internal_crm users
-- Drop existing UPDATE policy if it exists
DROP POLICY IF EXISTS "Super admins can update their company" ON public.companies;
DROP POLICY IF EXISTS "Internal CRM users can update all companies" ON public.companies;

-- Create new UPDATE policy that allows both super_admins (for their own company) and internal_crm users (globally)
CREATE POLICY "Super admins can update their company"
ON public.companies FOR UPDATE
USING (id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Internal CRM users can update all companies"
ON public.companies FOR UPDATE
USING (public.is_internal_crm_user(auth.uid()));

-- 4) Add DELETE policy for internal_crm users
DROP POLICY IF EXISTS "Internal CRM users can delete all companies" ON public.companies;
CREATE POLICY "Internal CRM users can delete all companies"
ON public.companies FOR DELETE
USING (public.is_internal_crm_user(auth.uid()));
