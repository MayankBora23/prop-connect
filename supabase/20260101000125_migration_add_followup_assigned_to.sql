-- Migration: Add assigned_to column to follow_ups table
-- Run this in Supabase SQL Editor

-- Add the assigned_to column to the follow_ups table
ALTER TABLE public.follow_ups
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);

-- Optional: Add an index for better query performance
CREATE INDEX IF NOT EXISTS idx_follow_ups_assigned_to ON public.follow_ups(assigned_to);
