-- Migration: Add lead_status enum and column to leads table
-- Run this in Supabase SQL Editor

-- 1. Create the enum type (if not already created from schema)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
        CREATE TYPE public.lead_status AS ENUM ('hot', 'warm', 'cold');
    END IF;
END $$;

-- 2. Add the column to the leads table
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS lead_status lead_status DEFAULT 'cold';

-- 3. Optional: Update existing leads to have a default status
-- You can run this if you want to set existing leads to 'cold' status
-- UPDATE public.leads SET lead_status = 'cold' WHERE lead_status IS NULL;
