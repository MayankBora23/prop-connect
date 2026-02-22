-- Migration: Simplify company_account_status to only Active and Suspended
-- Note: PostgreSQL doesn't support removing values from an enum. 
-- We handle this by creating a new enum and swapping it.

DO $$
BEGIN
    -- 1. Create a new temporary enum type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_account_status_new') THEN
        CREATE TYPE public.company_account_status_new AS ENUM ('active', 'suspended');
    END IF;

    -- 2. Update the companies table to use the new type
    -- Map 'expired' and 'terminated' (if any exist) to 'suspended'
    ALTER TABLE public.companies 
        ALTER COLUMN account_status DROP DEFAULT;

    ALTER TABLE public.companies 
        ALTER COLUMN account_status TYPE public.company_account_status_new 
        USING (
            CASE 
                WHEN account_status::text = 'active' THEN 'active'::public.company_account_status_new
                ELSE 'suspended'::public.company_account_status_new
            END
        );

    -- 3. Cleanup: Drop the old type and rename the new one
    DROP TYPE public.company_account_status;
    ALTER TYPE public.company_account_status_new RENAME TO company_account_status;

    -- 4. Restore the default value
    ALTER TABLE public.companies 
        ALTER COLUMN account_status SET DEFAULT 'active';

END
$$;

COMMENT ON COLUMN public.companies.account_status IS 'Simplified lifecycle status: active or suspended';
