-- Create new role enum with company-specific roles
DROP TYPE IF EXISTS public.app_role CASCADE;
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'manager', 'sales');

-- Create companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Add company_id to profiles
ALTER TABLE public.profiles 
ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Recreate user_roles table with company context
DROP TABLE IF EXISTS public.user_roles CASCADE;
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'sales',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Add company_id to all data tables
ALTER TABLE public.leads 
ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.properties 
ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.follow_ups 
ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.site_visits 
ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.messages 
ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.workflows 
ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Create helper function to get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Create helper function to get user role within their company
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles 
  WHERE user_id = _user_id 
  AND company_id = public.get_user_company_id(_user_id) 
  LIMIT 1
$$;

-- Create helper function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND company_id = public.get_user_company_id(_user_id)
    AND role = _role
  )
$$;

-- Create helper function to check if user has role at or above a level
CREATE OR REPLACE FUNCTION public.has_role_level(_user_id UUID, _min_role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
    AND ur.company_id = public.get_user_company_id(_user_id)
    AND (
      (_min_role = 'sales') OR
      (_min_role = 'manager' AND ur.role IN ('manager', 'admin', 'super_admin')) OR
      (_min_role = 'admin' AND ur.role IN ('admin', 'super_admin')) OR
      (_min_role = 'super_admin' AND ur.role = 'super_admin')
    )
  )
$$;

-- Companies RLS: Users can only see their own company
CREATE POLICY "Users can view their company"
ON public.companies FOR SELECT
USING (id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Super admins can update their company"
ON public.companies FOR UPDATE
USING (id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Anyone can create a company during signup"
ON public.companies FOR INSERT
WITH CHECK (true);

-- User roles RLS
CREATE POLICY "Users can view roles in their company"
ON public.user_roles FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Super admins can manage all roles"
ON public.user_roles FOR ALL
USING (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid()) 
  AND public.has_role_level(auth.uid(), 'admin')
  AND role != 'super_admin'
);

-- Drop old policies and create new ones for profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view profiles in their company"
ON public.profiles FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()) OR company_id IS NULL);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (user_id = auth.uid());

-- Drop old policies and create new ones for leads
DROP POLICY IF EXISTS "Users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Users can create leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update assigned leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can delete leads" ON public.leads;

CREATE POLICY "Users can view leads in their company"
ON public.leads FOR SELECT
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND (
    public.has_role_level(auth.uid(), 'manager')
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  )
);

CREATE POLICY "Users can create leads in their company"
ON public.leads FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update leads"
ON public.leads FOR UPDATE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND (
    public.has_role_level(auth.uid(), 'manager')
    OR assigned_to = auth.uid()
  )
);

CREATE POLICY "Admins can delete leads"
ON public.leads FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Drop old policies and create new ones for properties
DROP POLICY IF EXISTS "Anyone can view properties" ON public.properties;
DROP POLICY IF EXISTS "Authenticated users can create properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update properties" ON public.properties;
DROP POLICY IF EXISTS "Admins can delete properties" ON public.properties;

CREATE POLICY "Users can view properties in their company"
ON public.properties FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create properties in their company"
ON public.properties FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Managers can update properties"
ON public.properties FOR UPDATE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'manager')
);

CREATE POLICY "Admins can delete properties"
ON public.properties FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Drop old policies and create new ones for follow_ups
DROP POLICY IF EXISTS "Users can view follow-ups" ON public.follow_ups;
DROP POLICY IF EXISTS "Users can create follow-ups" ON public.follow_ups;
DROP POLICY IF EXISTS "Users can update follow-ups" ON public.follow_ups;
DROP POLICY IF EXISTS "Admins can delete follow-ups" ON public.follow_ups;

CREATE POLICY "Users can view follow-ups in their company"
ON public.follow_ups FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create follow-ups in their company"
ON public.follow_ups FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update follow-ups"
ON public.follow_ups FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete follow-ups"
ON public.follow_ups FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Drop old policies and create new ones for site_visits
DROP POLICY IF EXISTS "Users can view site visits" ON public.site_visits;
DROP POLICY IF EXISTS "Users can create site visits" ON public.site_visits;
DROP POLICY IF EXISTS "Users can update site visits" ON public.site_visits;
DROP POLICY IF EXISTS "Admins can delete site visits" ON public.site_visits;

CREATE POLICY "Users can view site visits in their company"
ON public.site_visits FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create site visits in their company"
ON public.site_visits FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update site visits"
ON public.site_visits FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete site visits"
ON public.site_visits FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Drop old policies and create new ones for messages
DROP POLICY IF EXISTS "Users can view messages" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update messages" ON public.messages;

CREATE POLICY "Users can view messages in their company"
ON public.messages FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create messages in their company"
ON public.messages FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update messages"
ON public.messages FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

-- Drop old policies and create new ones for workflows
DROP POLICY IF EXISTS "Users can view workflows" ON public.workflows;
DROP POLICY IF EXISTS "Admins can manage workflows" ON public.workflows;

CREATE POLICY "Users can view workflows in their company"
ON public.workflows FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage workflows"
ON public.workflows FOR ALL
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Update the handle_new_user function (will be used only for invited users now)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company_id UUID;
BEGIN
  -- Get company_id from user metadata (set during invite)
  _company_id := (NEW.raw_user_meta_data ->> 'company_id')::UUID;
  
  -- Insert profile
  INSERT INTO public.profiles (user_id, name, email, company_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email,
    _company_id
  );
  
  -- Only insert role if company_id is provided (invited user)
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

-- Create trigger for updated_at on companies
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();