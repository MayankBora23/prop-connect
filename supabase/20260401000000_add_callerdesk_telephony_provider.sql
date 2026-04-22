-- Add CallerDesk provider alongside Twilio for telephony.
-- All telephony keys are stored in the existing public.whatsapp_settings table.

-- 1) whatsapp_settings: provider + CallerDesk credentials
ALTER TABLE public.whatsapp_settings
ADD COLUMN IF NOT EXISTS telephony_provider TEXT NOT NULL DEFAULT 'twilio',
ADD COLUMN IF NOT EXISTS callerdesk_api_key TEXT,
ADD COLUMN IF NOT EXISTS callerdesk_secret_key TEXT,
ADD COLUMN IF NOT EXISTS callerdesk_integration_key TEXT,
ADD COLUMN IF NOT EXISTS callerdesk_bridge_number TEXT;

-- 2) call_logs: CallerDesk identifiers + correlation fields
ALTER TABLE public.call_logs
ADD COLUMN IF NOT EXISTS callerdesk_call_sid TEXT,
ADD COLUMN IF NOT EXISTS callerdesk_source_number TEXT,
ADD COLUMN IF NOT EXISTS callerdesk_customer_number TEXT,
ADD COLUMN IF NOT EXISTS callerdesk_bridge_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS call_logs_callerdesk_call_sid_unique
ON public.call_logs (callerdesk_call_sid)
WHERE callerdesk_call_sid IS NOT NULL;

