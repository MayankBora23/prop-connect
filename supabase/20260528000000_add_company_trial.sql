-- Migration: Add trial and premium columns to companies table
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'trial';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '14 days');
