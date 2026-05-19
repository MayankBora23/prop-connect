-- Lead interaction history (calls, notes, meetings, etc.) across lead modules

CREATE TABLE IF NOT EXISTS public.lead_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL,
  lead_type TEXT NOT NULL,
  interaction_type TEXT NOT NULL,
  note TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead_id ON public.lead_interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_created_at ON public.lead_interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead_created ON public.lead_interactions(lead_id, created_at DESC);

ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view lead interactions in their company" ON public.lead_interactions;
CREATE POLICY "Users can view lead interactions in their company"
  ON public.lead_interactions
  FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Users can insert lead interactions in their company" ON public.lead_interactions;
CREATE POLICY "Users can insert lead interactions in their company"
  ON public.lead_interactions
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Users can update lead interactions in their company" ON public.lead_interactions;
CREATE POLICY "Users can update lead interactions in their company"
  ON public.lead_interactions
  FOR UPDATE
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

DROP TRIGGER IF EXISTS update_lead_interactions_updated_at ON public.lead_interactions;
CREATE TRIGGER update_lead_interactions_updated_at
  BEFORE UPDATE ON public.lead_interactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_interactions;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
