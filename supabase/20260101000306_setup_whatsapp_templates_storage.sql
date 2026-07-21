-- Setup storage bucket and RLS policies for whatsapp-templates
-- Run this in Supabase SQL Editor

-- Create the whatsapp-templates bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-templates', 'whatsapp-templates', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the bucket
CREATE POLICY "Users can view whatsapp templates media"
ON storage.objects FOR SELECT
USING (bucket_id = 'whatsapp-templates');

CREATE POLICY "Users can upload whatsapp templates media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'whatsapp-templates'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update whatsapp templates media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'whatsapp-templates'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete whatsapp templates media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'whatsapp-templates'
  AND auth.role() = 'authenticated'
);
