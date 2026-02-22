-- Migration: Fix Company-to-Profile Activation Sync
-- This ensures that when a company is reactivated (allow_login = true), 
-- all its members regain access immediately.

CREATE OR REPLACE FUNCTION public.sync_company_suspension_to_profiles()
RETURNS TRIGGER AS $$
BEGIN
    -- CASE 1: LOCKDOWN (Company is Suspended or Login is disabled)
    IF (NEW.allow_login = FALSE AND OLD.allow_login = TRUE) OR 
       (NEW.account_status = 'suspended' AND OLD.account_status = 'active') THEN
        
        UPDATE public.profiles
        SET allow_login = FALSE
        WHERE company_id = NEW.id;
        
    END IF;

    -- CASE 2: REACTIVATION (Company is set back to Active and Login is enabled)
    -- This fixes the issue where profiles stayed locked after company reactivation
    IF (NEW.allow_login = TRUE AND NEW.account_status = 'active') AND 
       (OLD.allow_login = FALSE OR OLD.account_status = 'suspended') THEN
        
        UPDATE public.profiles
        SET allow_login = TRUE
        WHERE company_id = NEW.id;
        
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply the trigger
DROP TRIGGER IF EXISTS trigger_sync_company_suspension ON public.companies;
CREATE TRIGGER trigger_sync_company_suspension
AFTER UPDATE OF allow_login, account_status ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.sync_company_suspension_to_profiles();
