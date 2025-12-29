-- Migration: Add quantity field to vehicles table
-- This migration adds quantity management for vehicle inventory

-- Add quantity column to vehicles table
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1);

-- Add comment for the quantity field
COMMENT ON COLUMN public.vehicles.quantity IS 'Number of vehicles available in inventory';

-- Create index for quantity queries
CREATE INDEX IF NOT EXISTS idx_vehicles_quantity ON public.vehicles(quantity);
