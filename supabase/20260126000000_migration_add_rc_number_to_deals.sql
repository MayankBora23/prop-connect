-- Migration: Add RC Number field to deals table
-- Date: 2026-01-26

-- Add RC Number field to the deals table
ALTER TABLE public.deals
ADD COLUMN IF NOT EXISTS rc_number TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.deals.rc_number IS 'Registration Certificate (RC) Number for the vehicle';

-- Create index for RC number for better query performance
CREATE INDEX IF NOT EXISTS deals_rc_number_idx ON public.deals USING btree (rc_number);