-- Add analytics columns to call_logs for telephony dashboard
ALTER TABLE public.call_logs
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'twilio',
  ADD COLUMN IF NOT EXISTS customer_number TEXT,
  ADD COLUMN IF NOT EXISTS agent_number TEXT,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS destination_country TEXT;

CREATE INDEX IF NOT EXISTS idx_call_logs_company_created ON public.call_logs (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_agent_id ON public.call_logs (agent_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON public.call_logs (company_id, status);
CREATE INDEX IF NOT EXISTS idx_call_logs_direction ON public.call_logs (company_id, direction);
CREATE INDEX IF NOT EXISTS idx_call_logs_provider ON public.call_logs (company_id, provider);

-- Backfill provider for existing rows
UPDATE public.call_logs
SET provider = 'callerdesk'
WHERE provider IS DISTINCT FROM 'callerdesk'
  AND (callerdesk_call_sid IS NOT NULL OR callerdesk_customer_number IS NOT NULL OR callerdesk_source_number IS NOT NULL);

UPDATE public.call_logs
SET provider = 'twilio'
WHERE provider IS NULL
   OR (twilio_call_sid IS NOT NULL AND callerdesk_call_sid IS NULL AND callerdesk_customer_number IS NULL);
