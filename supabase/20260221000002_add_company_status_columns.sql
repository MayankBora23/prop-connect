-- Migration: Add administrative control columns to companies table
-- Purpose: Support multi-tenant account management (login control, status tracking, and notes)

-- 1) Create account status enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_account_status') THEN
        CREATE TYPE public.company_account_status AS ENUM ('active', 'suspended', 'expired', 'terminated');
    END IF;
END
$$;

-- 2) Add columns to companies table
-- allow_login: boolean to quickly disable access
-- account_status: enum to track lifecycle
-- status_notes: text field for reasons/history
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS allow_login BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS account_status public.company_account_status NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS status_notes TEXT;

-- 3) Add comments for documentation
COMMENT ON COLUMN public.companies.allow_login IS 'Master switch to allow/deny login access for all users of this company';
COMMENT ON COLUMN public.companies.account_status IS 'The current administrative status of the company account';
COMMENT ON COLUMN public.companies.status_notes IS 'Internal notes regarding status changes (e.g., suspension reason)';

-- 4) Note on RLS: 
-- The existing RLS policies for 'internal_crm' users already allow them to update these columns
-- based on the previous migration (20260216000001_add_internal_crm_industry.sql).
