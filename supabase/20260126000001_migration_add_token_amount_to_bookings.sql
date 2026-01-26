-- Migration: Add token_amount field to bookings table
-- Date: 2026-01-26

-- Add token_amount field to the bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS token_amount NUMERIC(12,2) DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.bookings.token_amount IS 'Token/advance amount paid for the booking';

-- Create index for token_amount for better query performance
CREATE INDEX IF NOT EXISTS bookings_token_amount_idx ON public.bookings USING btree (token_amount);