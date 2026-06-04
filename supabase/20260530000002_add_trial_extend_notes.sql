-- Notes for Internal CRM "Extend trial" action
ALTER TABLE public.company_subscriptions
  ADD COLUMN IF NOT EXISTS trial_extend_notes text;

COMMENT ON COLUMN public.company_subscriptions.trial_extend_notes IS 'Internal CRM notes from Extend Trial action';
