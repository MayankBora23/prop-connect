-- Migration: Add telephony support to internal_leads
ALTER TABLE public.internal_leads 
ADD COLUMN IF NOT EXISTS is_telephony_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_called_at TIMESTAMPTZ;

-- Update RLS if needed (already broad enough based on previous migration)
