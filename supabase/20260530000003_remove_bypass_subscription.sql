-- Remove Allow Access / bypass subscription columns (extend trial only)

ALTER TABLE public.company_subscriptions
  DROP COLUMN IF EXISTS bypass_expiry,
  DROP COLUMN IF EXISTS bypass_notes,
  DROP COLUMN IF EXISTS bypass_until;
