CREATE TABLE IF NOT EXISTS public.ai_flow_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  industry text NOT NULL,
  steps jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, industry)
);

ALTER TABLE public.ai_flow_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company members view own config"
  ON public.ai_flow_configs FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "admins manage config"
  ON public.ai_flow_configs FOR ALL
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

DROP TRIGGER IF EXISTS update_ai_flow_configs_updated_at ON public.ai_flow_configs;
CREATE TRIGGER update_ai_flow_configs_updated_at
  BEFORE UPDATE ON public.ai_flow_configs
  EXECUTE PROCEDURE public.update_updated_at_column();
