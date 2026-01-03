-- Fix team member removal permissions
-- Run this in Supabase SQL Editor

-- Add a specific policy for super admins to delete team members
-- This ensures super admins can remove team members from their company

-- Drop the existing restrictive policy and replace with more specific ones
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;

-- Allow super admins to view all roles in their company
CREATE POLICY "Super admins can view all roles in company"
ON public.user_roles FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

-- Allow super admins to insert roles in their company
CREATE POLICY "Super admins can insert roles in company"
ON public.user_roles FOR INSERT
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role(auth.uid(), 'super_admin')
);

-- Allow super admins to update roles in their company
CREATE POLICY "Super admins can update roles in company"
ON public.user_roles FOR UPDATE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role(auth.uid(), 'super_admin')
);

-- Allow super admins to delete roles in their company (for team member removal)
CREATE POLICY "Super admins can delete roles in company"
ON public.user_roles FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role(auth.uid(), 'super_admin')
);

-- Allow super admins to delete profiles from their company
CREATE POLICY "Super admins can delete profiles in company"
ON public.profiles FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role(auth.uid(), 'super_admin')
);
