-- Team Member Limit Enforcement Migration
-- Adds user_limit to companies and enforces it via trigger on user_roles

-- 1) Safely add user_limit column to companies if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'companies'
      AND column_name = 'user_limit'
  ) THEN
    ALTER TABLE public.companies
      ADD COLUMN user_limit INTEGER NOT NULL DEFAULT 5;

    COMMENT ON COLUMN public.companies.user_limit IS 'Maximum number of team members allowed for this company (NULL means no limit)';
  END IF;
END
$$;

-- 2) Function to enforce team member limit on user_roles inserts
CREATE OR REPLACE FUNCTION public.check_team_member_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_limit INTEGER;
  v_current_count INTEGER;
BEGIN
  -- Get the configured user_limit for this company
  SELECT user_limit
  INTO v_user_limit
  FROM public.companies
  WHERE id = NEW.company_id;

  -- If no limit is set, allow insert
  IF v_user_limit IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count existing team members for this company
  SELECT COUNT(*)
  INTO v_current_count
  FROM public.user_roles
  WHERE company_id = NEW.company_id;

  -- Enforce limit
  IF v_current_count >= v_user_limit THEN
    RAISE EXCEPTION 'Team member limit reached (max: %)', v_user_limit
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- 3) BEFORE INSERT trigger on user_roles to enforce the limit
DROP TRIGGER IF EXISTS check_team_member_limit_trigger ON public.user_roles;

CREATE TRIGGER check_team_member_limit_trigger
BEFORE INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.check_team_member_limit();

-- 4) Performance index on user_roles(company_id) for fast counting
CREATE INDEX IF NOT EXISTS idx_user_roles_company_id
ON public.user_roles (company_id);

