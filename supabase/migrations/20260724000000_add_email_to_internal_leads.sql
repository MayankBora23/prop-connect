-- Migration: Add email column to internal_leads table
ALTER TABLE public.internal_leads 
ADD COLUMN IF NOT EXISTS email TEXT;
