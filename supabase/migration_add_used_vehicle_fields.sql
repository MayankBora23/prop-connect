-- Migration: Add support for used vehicles with additional fields
-- This migration adds used_car and used_bike vehicle types and required fields for used vehicles

-- Add used vehicle types to the enum
ALTER TYPE public.vehicle_type ADD VALUE 'used_car';
ALTER TYPE public.vehicle_type ADD VALUE 'used_bike';

-- Add new columns for used vehicle information
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS odometer_reading INTEGER,
ADD COLUMN IF NOT EXISTS ownership_count INTEGER,
ADD COLUMN IF NOT EXISTS rc_status TEXT CHECK (rc_status IN ('available', 'pending', 'missing')),
ADD COLUMN IF NOT EXISTS insurance_status TEXT CHECK (insurance_status IN ('valid', 'expired', 'pending', 'missing'));

-- Add comments for the new fields
COMMENT ON COLUMN public.vehicles.odometer_reading IS 'Odometer reading in kilometers (for used vehicles)';
COMMENT ON COLUMN public.vehicles.ownership_count IS 'Number of previous owners (for used vehicles)';
COMMENT ON COLUMN public.vehicles.rc_status IS 'Registration certificate status: available, pending, missing';
COMMENT ON COLUMN public.vehicles.insurance_status IS 'Insurance status: valid, expired, pending, missing';

-- Note: Validation for used vehicles is handled by application logic (Zod schema)
-- This avoids PostgreSQL enum constraint limitations

-- Create an index on vehicle_type for better performance
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON public.vehicles(vehicle_type);
