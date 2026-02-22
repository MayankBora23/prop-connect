-- Migration: Add user-level granular login control and global lockdown support
-- 1. Add allow_login to profiles for individual team member control
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS allow_login BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.profiles.allow_login IS 'Master switch for individual team members access';

-- 2. Create a helper function to check if a user is actively allowed to use the system
-- This function checks both the company master switch and the user individual switch
CREATE OR REPLACE FUNCTION public.check_user_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
    _company_id UUID;
    _company_allowed BOOLEAN;
    _user_allowed BOOLEAN;
BEGIN
    -- Get user company and their individual switch
    SELECT company_id, allow_login INTO _company_id, _user_allowed 
    FROM public.profiles 
    WHERE user_id = _user_id;

    -- If no profile found, deny access
    IF _company_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Get company master switch
    SELECT allow_login INTO _company_allowed 
    FROM public.companies 
    WHERE id = _company_id;

    -- Access is granted ONLY if BOTH switches are TRUE
    RETURN (COALESCE(_company_allowed, FALSE) AND COALESCE(_user_allowed, FALSE));
END;
$$;

-- 3. Update existing RLS logic (Example for the internal CRM view)
-- You can use this function in your App.tsx to perform a global lockdown check
