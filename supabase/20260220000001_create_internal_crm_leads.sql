-- Migration: Create internal_leads table for Internal CRM
-- This table is global (no company_id partitioning) and is intended
-- for CRM owners and internal CRM users only.

-- 1) Create internal_lead_stage enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'internal_lead_stage'
  ) THEN
    CREATE TYPE public.internal_lead_stage AS ENUM (
      'new',
      'contacted',
      'demo_scheduled',
      'trial_started',
      'closed_won',
      'closed_lost'
    );
  END IF;
END $$;

-- 2) Create internal_leads table
CREATE TABLE IF NOT EXISTS public.internal_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  lead_name TEXT NOT NULL,
  phone_no TEXT,
  address TEXT,
  industry public.industry_type NOT NULL,
  user_limit INTEGER DEFAULT 5,
  stage public.internal_lead_stage NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id)
);

-- Add comments for documentation
COMMENT ON TABLE public.internal_leads IS 'Global internal CRM leads managed by platform owners.';
COMMENT ON COLUMN public.internal_leads.user_limit IS 'The seat limit to be applied if this lead converts to a Company.';

-- 3) Enable RLS and define policies
ALTER TABLE public.internal_leads ENABLE ROW LEVEL SECURITY;

-- Drop existing to avoid conflicts
DROP POLICY IF EXISTS "Internal CRM users can view internal leads" ON public.internal_leads;
DROP POLICY IF EXISTS "Internal CRM users can manage internal leads" ON public.internal_leads;

-- Policy for Viewing
CREATE POLICY "Internal CRM users can view internal leads"
ON public.internal_leads
FOR SELECT
TO authenticated
USING (
  public.is_internal_crm_user(auth.uid())
  OR public.has_role(auth.uid(), 'super_admin')
);

-- Policy for Managing (Using ALL to cover Insert, Update, and Delete)
-- This fixes the ERROR 42601 caused by combining multiple actions in FOR
CREATE POLICY "Internal CRM users can manage internal leads"
ON public.internal_leads
FOR ALL
TO authenticated
USING (
  public.is_internal_crm_user(auth.uid())
  OR public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  public.is_internal_crm_user(auth.uid())
  OR public.has_role(auth.uid(), 'super_admin')
);

-- 4) Performance Indexes
CREATE INDEX IF NOT EXISTS idx_internal_leads_stage ON public.internal_leads(stage);
CREATE INDEX IF NOT EXISTS idx_internal_leads_created_by ON public.internal_leads(created_by);
