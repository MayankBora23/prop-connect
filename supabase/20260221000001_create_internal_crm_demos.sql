-- Migration: Create internal_crm_demos table for Internal CRM
-- This table tracks scheduled CRM demos for internal leads.
-- It follows the pattern of automobile test_drives but specifically for the internal CRM module.

-- 1) Create internal_demo_status enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'internal_demo_status'
  ) THEN
    CREATE TYPE public.internal_demo_status AS ENUM (
      'scheduled',
      'completed',
      'cancelled'
    );
  END IF;
END $$;

-- 2) Create internal_crm_demos table
CREATE TABLE IF NOT EXISTS public.internal_crm_demos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.internal_leads(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  demo_date DATE NOT NULL,
  demo_time TIME NOT NULL,
  status public.internal_demo_status NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Add comments for documentation
COMMENT ON TABLE public.internal_crm_demos IS 'Tracks scheduled CRM software demos for prospective internal leads.';

-- 3) Enable RLS and define policies
-- Assumes is_internal_crm_user function exists as per internal_leads migration
ALTER TABLE public.internal_crm_demos ENABLE ROW LEVEL SECURITY;

-- Drop existing to avoid conflicts
DROP POLICY IF EXISTS "Internal CRM users can view demos" ON public.internal_crm_demos;
DROP POLICY IF EXISTS "Internal CRM users can manage demos" ON public.internal_crm_demos;

-- Policy for Viewing
CREATE POLICY "Internal CRM users can view demos"
ON public.internal_crm_demos
FOR SELECT
TO authenticated
USING (
  public.is_internal_crm_user(auth.uid())
  OR public.has_role(auth.uid(), 'super_admin')
);

-- Policy for Managing (Insert, Update, Delete)
CREATE POLICY "Internal CRM users can manage demos"
ON public.internal_crm_demos
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
CREATE INDEX IF NOT EXISTS idx_internal_crm_demos_lead_id ON public.internal_crm_demos(lead_id);
CREATE INDEX IF NOT EXISTS idx_internal_crm_demos_company_id ON public.internal_crm_demos(company_id);
CREATE INDEX IF NOT EXISTS idx_internal_crm_demos_status ON public.internal_crm_demos(status);
CREATE INDEX IF NOT EXISTS idx_internal_crm_demos_date ON public.internal_crm_demos(demo_date);

-- 5) Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER handle_internal_crm_demos_updated_at
  BEFORE UPDATE ON public.internal_crm_demos
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();
