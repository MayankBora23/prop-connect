-- WhatsApp multi-provider support (Twilio + Meta Cloud API)
-- Idempotent migration: safe to run multiple times

-- 1) Provider selection on companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS whatsapp_provider TEXT NOT NULL DEFAULT 'twilio',
  ADD COLUMN IF NOT EXISTS meta_phone_number_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS meta_waba_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_access_token TEXT,
  ADD COLUMN IF NOT EXISTS meta_webhook_verify_token TEXT;

-- Backfill in case an environment had NULLs
UPDATE public.companies
SET whatsapp_provider = 'twilio'
WHERE whatsapp_provider IS NULL;

-- 2) Constraint enforcing supported providers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'companies_whatsapp_provider_check'
  ) THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT companies_whatsapp_provider_check
      CHECK (whatsapp_provider IN ('twilio', 'meta'));
  END IF;
END $$;

-- Optional: indexes for Meta routing (webhook lookup + send lookup)
CREATE INDEX IF NOT EXISTS idx_companies_meta_phone_number_id
  ON public.companies (meta_phone_number_id);

CREATE INDEX IF NOT EXISTS idx_companies_meta_waba_id
  ON public.companies (meta_waba_id);

