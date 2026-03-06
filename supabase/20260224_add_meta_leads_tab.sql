-- Migration: Add Meta Lead Ads & WhatsApp lead integration
-- Date: 2026-02-24

-- 1) Add Meta integration columns to companies table
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS webhook_token TEXT,
  ADD COLUMN IF NOT EXISTS meta_verify_token TEXT,
  ADD COLUMN IF NOT EXISTS enable_meta_leads BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS meta_access_token TEXT;

-- 2) Backfill secure tokens for existing companies
UPDATE public.companies
SET webhook_token = gen_random_uuid()::text
WHERE webhook_token IS NULL;

UPDATE public.companies
SET meta_verify_token = encode(gen_random_bytes(32), 'hex')
WHERE meta_verify_token IS NULL;

-- 3) Enforce uniqueness and add indexes for fast lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_webhook_token
  ON public.companies (webhook_token);

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_meta_verify_token
  ON public.companies (meta_verify_token);

-- 4) Ensure leads table can store raw Meta payloads and a source
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS raw_payload JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source TEXT;

-- 5) Ensure education + automobile lead tables can also store raw payloads + source
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS raw_payload JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source TEXT;

ALTER TABLE public.auto_leads
  ADD COLUMN IF NOT EXISTS raw_payload JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source TEXT;

