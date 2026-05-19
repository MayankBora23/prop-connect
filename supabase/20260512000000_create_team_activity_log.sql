-- Team activity log: immutable CRM actions for team productivity reporting

CREATE TABLE IF NOT EXISTS public.team_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  reference_id UUID,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_activity_log_profile_user_id
  ON public.team_activity_log(profile_user_id);

CREATE INDEX IF NOT EXISTS idx_team_activity_log_company_id
  ON public.team_activity_log(company_id);

CREATE INDEX IF NOT EXISTS idx_team_activity_log_company_profile_created
  ON public.team_activity_log(company_id, profile_user_id, created_at DESC);

ALTER TABLE public.team_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view team activity in their company"
ON public.team_activity_log FOR SELECT
USING (
  company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can insert team activity in their company"
ON public.team_activity_log FOR INSERT
WITH CHECK (
  company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);
