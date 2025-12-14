-- Update handle_new_user to create company if registering new company
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _company_id UUID;
  _company_name TEXT;
  _company_email TEXT;
BEGIN
  -- Check if this is a new company registration
  _company_name := NEW.raw_user_meta_data ->> 'company_name';
  _company_email := NEW.raw_user_meta_data ->> 'company_email';
  _company_id := (NEW.raw_user_meta_data ->> 'company_id')::UUID;
  
  -- If company_name is provided, create a new company
  IF _company_name IS NOT NULL AND _company_id IS NULL THEN
    INSERT INTO public.companies (name, email)
    VALUES (_company_name, COALESCE(_company_email, NEW.email))
    RETURNING id INTO _company_id;
  END IF;
  
  -- Insert profile
  INSERT INTO public.profiles (user_id, name, email, company_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email,
    _company_id
  );
  
  -- Insert role if company_id exists
  IF _company_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, company_id, role)
    VALUES (
      NEW.id, 
      _company_id, 
      COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'sales')
    );
  END IF;
  
  RETURN NEW;
END;
$$;