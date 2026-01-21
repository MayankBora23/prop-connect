-- Migration: add reply_to_message_sid to whatsapp_messages
ALTER TABLE public.whatsapp_messages
ADD COLUMN IF NOT EXISTS reply_to_message_sid TEXT;

COMMENT ON COLUMN public.whatsapp_messages.reply_to_message_sid IS 'Twilio/WhatsApp message SID of the message being replied to';

