-- Per-user CallerDesk bridge (agent mobile) — each team member sets their own number in Profile Settings
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS callerdesk_bridge_number TEXT;

COMMENT ON COLUMN public.profiles.callerdesk_bridge_number IS
  'CallerDesk bridge/agent mobile (10 digits). Each user sets their own number for click-to-call.';

CREATE INDEX IF NOT EXISTS idx_profiles_callerdesk_bridge_number
  ON public.profiles (callerdesk_bridge_number)
  WHERE callerdesk_bridge_number IS NOT NULL;
