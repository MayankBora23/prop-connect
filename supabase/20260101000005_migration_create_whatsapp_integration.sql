-- WhatsApp CRM Integration Migration
-- Creates tables for multi-tenant WhatsApp integration with Twilio

-- 1) WhatsApp Settings table (company-specific credentials)
CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  twilio_sid TEXT NOT NULL,
  twilio_auth_token TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id) -- One WhatsApp setting per company
);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_whatsapp_settings_updated_at ON public.whatsapp_settings;
CREATE TRIGGER update_whatsapp_settings_updated_at
BEFORE UPDATE ON public.whatsapp_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

-- 2) WhatsApp Conversations table
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, contact_phone) -- One conversation per phone number per company
);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_whatsapp_conversations_updated_at ON public.whatsapp_conversations;
CREATE TRIGGER update_whatsapp_conversations_updated_at
BEFORE UPDATE ON public.whatsapp_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

-- 3) WhatsApp Messages table
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  direction message_direction NOT NULL, -- 'incoming' or 'outgoing'
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent', -- sent, delivered, read, failed
  message_sid TEXT, -- Twilio message SID for tracking
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_url TEXT, -- URL of uploaded file/image
  file_name TEXT, -- Original filename
  file_type TEXT -- 'image' or 'document'
);

-- Enable RLS
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies

-- WhatsApp Settings Policies
CREATE POLICY "Users can view WhatsApp settings in their company"
ON public.whatsapp_settings FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage WhatsApp settings"
ON public.whatsapp_settings FOR ALL
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- WhatsApp Conversations Policies
CREATE POLICY "Users can view WhatsApp conversations in their company"
ON public.whatsapp_conversations FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create WhatsApp conversations in their company"
ON public.whatsapp_conversations FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update WhatsApp conversations in their company"
ON public.whatsapp_conversations FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

-- WhatsApp Messages Policies
CREATE POLICY "Users can view WhatsApp messages in their company"
ON public.whatsapp_messages FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create WhatsApp messages in their company"
ON public.whatsapp_messages FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update WhatsApp messages in their company"
ON public.whatsapp_messages FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_messages TO authenticated;
