-- Telephony Integration Migration
-- Creates tables and schema for Twilio Voice integration

-- 1) Call Logs table
CREATE TABLE IF NOT EXISTS public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  status TEXT NOT NULL DEFAULT 'initiated', -- initiated, ringing, connected, completed, failed, busy, no_answer
  duration INTEGER DEFAULT 0, -- in seconds
  recording_url TEXT,
  twilio_call_sid TEXT UNIQUE,
  twilio_from_number TEXT,
  twilio_to_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_call_logs_updated_at ON public.call_logs;
CREATE TRIGGER update_call_logs_updated_at
BEFORE UPDATE ON public.call_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- 2) Add telephony columns to whatsapp_settings
ALTER TABLE public.whatsapp_settings
ADD COLUMN IF NOT EXISTS twilio_api_key_sid TEXT,
ADD COLUMN IF NOT EXISTS twilio_api_key_secret TEXT,
ADD COLUMN IF NOT EXISTS twilio_twiml_app_sid TEXT;

-- 3) Add agent_identity to users/profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS agent_identity TEXT UNIQUE;

-- 4) Add is_telephony_enabled to leads table
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS is_telephony_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_called_at TIMESTAMP WITH TIME ZONE;

-- Row Level Security Policies

-- Call Logs Policies
CREATE POLICY "Users can view call logs in their company"
ON public.call_logs FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()) OR auth.role() = 'service_role');

CREATE POLICY "Users can create call logs in their company"
ON public.call_logs FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()) OR auth.role() = 'service_role');

CREATE POLICY "Users can update call logs in their company"
ON public.call_logs FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()) OR auth.role() = 'service_role');

-- WhatsApp Settings update policy (already exists but needs to allow service_role for updates)
DROP POLICY IF EXISTS "Admins can manage WhatsApp settings" ON public.whatsapp_settings;
CREATE POLICY "Admins can manage WhatsApp settings"
ON public.whatsapp_settings FOR ALL
USING (
  (company_id = public.get_user_company_id(auth.uid()) AND public.has_role_level(auth.uid(), 'admin'))
  OR auth.role() = 'service_role'
);

-- Profiles update policy (allow users to update their own agent_identity)
CREATE POLICY "Users can update their own profile agent_identity"
ON public.profiles FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Leads update policy (already exists but ensure service_role can update)
DROP POLICY IF EXISTS "Users can update leads" ON public.leads;
CREATE POLICY "Users can update leads"
ON public.leads FOR UPDATE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND (
    public.has_role_level(auth.uid(), 'manager')
    OR assigned_to = auth.uid()
    OR auth.role() = 'service_role'
  )
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.call_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.whatsapp_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.leads TO authenticated;