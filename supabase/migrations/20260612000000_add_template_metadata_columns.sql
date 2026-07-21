-- Migration: Add example_values and variable_labels columns to whatsapp_templates
-- Run this in Supabase SQL Editor

ALTER TABLE public.whatsapp_templates
  ADD COLUMN IF NOT EXISTS example_values jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS variable_labels jsonb DEFAULT '{}'::jsonb;
