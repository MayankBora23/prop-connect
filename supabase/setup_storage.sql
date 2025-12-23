-- Setup storage bucket for property images
-- Run this in Supabase SQL Editor

-- Create the property-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true);

-- Set up RLS policies for the bucket
CREATE POLICY "Users can view property images"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-images');

CREATE POLICY "Users can upload property images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-images'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their property images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'property-images'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their property images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-images'
  AND auth.role() = 'authenticated'
);
