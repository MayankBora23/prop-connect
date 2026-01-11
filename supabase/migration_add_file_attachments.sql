-- Migration to add file attachment support to WhatsApp messages
-- Adds columns for file_url, file_name, and file_type to existing whatsapp_messages table

-- Add file attachment columns to whatsapp_messages table
-- Support multiple files per message using JSON arrays
ALTER TABLE public.whatsapp_messages
ADD COLUMN IF NOT EXISTS file_urls TEXT[], -- Array of file URLs
ADD COLUMN IF NOT EXISTS file_names TEXT[], -- Array of original filenames
ADD COLUMN IF NOT EXISTS file_types TEXT[], -- Array of file types
ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL; -- For reply functionality

-- Create storage bucket for WhatsApp attachments if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-attachments', 'whatsapp-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the storage bucket
-- Allow all authenticated users to upload/view/delete WhatsApp attachments
-- Files are organized by company ID in the filename structure

CREATE POLICY "Users can upload WhatsApp attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'whatsapp-attachments');

CREATE POLICY "Users can view WhatsApp attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'whatsapp-attachments');

CREATE POLICY "Users can delete WhatsApp attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'whatsapp-attachments');

-- Add comments for documentation
COMMENT ON COLUMN public.whatsapp_messages.file_url IS 'URL of uploaded file/image stored in Supabase storage';
COMMENT ON COLUMN public.whatsapp_messages.file_name IS 'Original filename of the uploaded file';
COMMENT ON COLUMN public.whatsapp_messages.file_type IS 'Type of file: image or document';