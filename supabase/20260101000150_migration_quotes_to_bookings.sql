-- Migration: Change quotes to bookings for automobile industry
-- This migration renames the quotes table to bookings and adds booking-specific fields

-- First, create the new booking status enum
DROP TYPE IF EXISTS public.booking_status CASCADE;
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- Rename quotes table to bookings
ALTER TABLE public.quotes RENAME TO bookings;

-- Rename the status column to use the new enum
ALTER TABLE public.bookings
DROP COLUMN status;

ALTER TABLE public.bookings
ADD COLUMN status booking_status NOT NULL DEFAULT 'pending';

-- Add booking-specific columns
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS delivery_date DATE,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'completed', 'refunded')),
ADD COLUMN IF NOT EXISTS down_payment DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS booking_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_balance DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_location TEXT,
ADD COLUMN IF NOT EXISTS special_requests TEXT,
ADD COLUMN IF NOT EXISTS booking_reference TEXT UNIQUE;

-- Update the total_amount calculation to include remaining_balance
ALTER TABLE public.bookings
ADD CONSTRAINT chk_booking_amounts CHECK (
  (down_payment + remaining_balance) <= total_amount
);

-- Rename quote_number to booking_number
ALTER TABLE public.bookings
RENAME COLUMN quote_number TO booking_number;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_delivery_date ON public.bookings(delivery_date);
CREATE INDEX IF NOT EXISTS idx_bookings_lead_id ON public.bookings(lead_id);

-- Update deals table to reference bookings instead of quotes
ALTER TABLE public.deals
DROP CONSTRAINT IF EXISTS deals_quote_id_fkey;

ALTER TABLE public.deals
ADD CONSTRAINT deals_quote_id_fkey
FOREIGN KEY (quote_id) REFERENCES public.bookings(id) ON DELETE SET NULL;

-- Update RLS policies for bookings
DROP POLICY IF EXISTS "Users can view quotes in their company" ON public.bookings;
DROP POLICY IF EXISTS "Users can create quotes in their company" ON public.bookings;
DROP POLICY IF EXISTS "Users can update quotes" ON public.bookings;
DROP POLICY IF EXISTS "Admins can delete quotes" ON public.bookings;

-- Create new RLS policies for bookings
CREATE POLICY "Users can view bookings in their company"
ON public.bookings FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create bookings in their company"
ON public.bookings FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update bookings"
ON public.bookings FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete bookings"
ON public.bookings FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Create functions for vehicle quantity management
CREATE OR REPLACE FUNCTION public.decrement_vehicle_quantity(vehicle_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.vehicles
  SET quantity = GREATEST(quantity - 1, 0)
  WHERE id = vehicle_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_vehicle_quantity(vehicle_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.vehicles
  SET quantity = quantity + 1
  WHERE id = vehicle_id;
END;
$$;

-- Update trigger name
DROP TRIGGER IF EXISTS update_quotes_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
