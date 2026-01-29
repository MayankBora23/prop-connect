-- AI Lead Qualification Migration
-- Adds columns to whatsapp_conversations table for AI-powered lead qualification flow

-- Add AI-related columns to whatsapp_conversations table
ALTER TABLE public.whatsapp_conversations
ADD COLUMN IF NOT EXISTS is_new_user BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS current_step INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS purpose TEXT,
ADD COLUMN IF NOT EXISTS property_type TEXT,
ADD COLUMN IF NOT EXISTS budget TEXT,
ADD COLUMN IF NOT EXISTS location TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.whatsapp_conversations.is_new_user IS 'Whether this is a new user for AI qualification flow';
COMMENT ON COLUMN public.whatsapp_conversations.ai_enabled IS 'Whether AI qualification is enabled for this conversation';
COMMENT ON COLUMN public.whatsapp_conversations.current_step IS 'Current step in the AI qualification flow (1-5)';
COMMENT ON COLUMN public.whatsapp_conversations.purpose IS 'Captured purpose from AI flow (buy/rent)';
COMMENT ON COLUMN public.whatsapp_conversations.property_type IS 'Captured property type from AI flow';
COMMENT ON COLUMN public.whatsapp_conversations.budget IS 'Captured budget range from AI flow';
COMMENT ON COLUMN public.whatsapp_conversations.location IS 'Captured preferred location from AI flow';