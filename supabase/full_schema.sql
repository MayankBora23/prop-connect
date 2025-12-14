-- Full DB schema for Prop Connect (create / run in Supabase SQL editor)

-- 1) Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2) Enums
DROP TYPE IF EXISTS public.app_role CASCADE;
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'manager', 'sales');

DROP TYPE IF EXISTS public.follow_up_status CASCADE;
CREATE TYPE public.follow_up_status AS ENUM ('pending', 'completed', 'missed');

DROP TYPE IF EXISTS public.follow_up_type CASCADE;
CREATE TYPE public.follow_up_type AS ENUM ('call', 'whatsapp', 'meeting', 'email');

DROP TYPE IF EXISTS public.lead_stage CASCADE;
CREATE TYPE public.lead_stage AS ENUM (
  'new', 'contacted', 'follow-up', 'site-visit', 'negotiation', 'closed-won', 'closed-lost'
);

DROP TYPE IF EXISTS public.message_direction CASCADE;
CREATE TYPE public.message_direction AS ENUM ('incoming','outgoing');

DROP TYPE IF EXISTS public.message_status CASCADE;
CREATE TYPE public.message_status AS ENUM ('sent','delivered','read');

DROP TYPE IF EXISTS public.message_type CASCADE;
CREATE TYPE public.message_type AS ENUM ('text','image','document');

DROP TYPE IF EXISTS public.property_status CASCADE;
CREATE TYPE public.property_status AS ENUM ('available','sold','upcoming');

DROP TYPE IF EXISTS public.site_visit_status CASCADE;
CREATE TYPE public.site_visit_status AS ENUM ('scheduled','completed','cancelled');

DROP TYPE IF EXISTS public.workflow_status CASCADE;
CREATE TYPE public.workflow_status AS ENUM ('active','inactive');

-- 3) Common utility trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 4) Companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 6) User roles table (company-scoped)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'sales',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS update_user_roles_updated_at ON public.user_roles;
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 7) Leads
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  location TEXT,
  property_type TEXT,
  budget TEXT,
  notes TEXT[] DEFAULT ARRAY[]::text[],
  tags TEXT[] DEFAULT ARRAY[]::text[],
  stage lead_stage NOT NULL DEFAULT 'new',
  assigned_to UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_contact TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  lead_score INTEGER DEFAULT NULL,
  score_reasoning TEXT DEFAULT NULL,
  scored_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 8) Properties
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  price TEXT NOT NULL,
  area TEXT,
  bhk TEXT,
  images TEXT[] DEFAULT ARRAY[]::text[],
  status property_status NOT NULL DEFAULT 'available',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS update_properties_updated_at ON public.properties;
CREATE TRIGGER update_properties_updated_at
BEFORE UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 9) Follow-ups
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  follow_up_date DATE NOT NULL,
  follow_up_time TIME NOT NULL,
  notes TEXT,
  type follow_up_type NOT NULL DEFAULT 'call',
  status follow_up_status NOT NULL DEFAULT 'pending',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);

ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS update_follow_ups_updated_at ON public.follow_ups;
CREATE TRIGGER update_follow_ups_updated_at
BEFORE UPDATE ON public.follow_ups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 10) Messages (chat / whatsapp)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type message_type NOT NULL DEFAULT 'text',
  direction message_direction NOT NULL,
  status message_status NOT NULL DEFAULT 'sent',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 11) Site visits
CREATE TABLE IF NOT EXISTS public.site_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  visit_time TIME NOT NULL,
  assigned_to UUID,
  feedback TEXT,
  status site_visit_status NOT NULL DEFAULT 'scheduled',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS update_site_visits_updated_at ON public.site_visits;
CREATE TRIGGER update_site_visits_updated_at
BEFORE UPDATE ON public.site_visits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 12) Workflows
CREATE TABLE IF NOT EXISTS public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  action TEXT NOT NULL,
  runs_count INTEGER NOT NULL DEFAULT 0,
  last_run TIMESTAMP WITH TIME ZONE,
  status workflow_status NOT NULL DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS update_workflows_updated_at ON public.workflows;
CREATE TRIGGER update_workflows_updated_at
BEFORE UPDATE ON public.workflows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 13) Helper functions (company/role lookups)
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
    AND company_id = public.get_user_company_id(_user_id)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND company_id = public.get_user_company_id(_user_id)
      AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role_level(_user_id UUID, _min_role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.company_id = public.get_user_company_id(_user_id)
      AND (
        (_min_role = 'sales') OR
        (_min_role = 'manager' AND ur.role IN ('manager','admin','super_admin')) OR
        (_min_role = 'admin' AND ur.role IN ('admin','super_admin')) OR
        (_min_role = 'super_admin' AND ur.role = 'super_admin')
      )
  );
$$;

-- 14) Signup / user onboarding function: create profile (+ optionally company & role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company_id UUID;
  _company_name TEXT;
  _company_email TEXT;
BEGIN
  -- Attempt to read company metadata from NEW.raw_user_meta_data (supabase auth metadata)
  BEGIN
    _company_name := NEW.raw_user_meta_data ->> 'company_name';
    _company_email := NEW.raw_user_meta_data ->> 'company_email';
    _company_id := (NEW.raw_user_meta_data ->> 'company_id')::UUID;
  EXCEPTION WHEN others THEN
    _company_name := NULL;
    _company_email := NULL;
    _company_id := NULL;
  END;

  -- If registering a new company (company_name provided but no company_id), create it
  IF _company_name IS NOT NULL AND _company_id IS NULL THEN
    INSERT INTO public.companies (name, email)
    VALUES (_company_name, COALESCE(_company_email, NEW.email))
    RETURNING id INTO _company_id;
  END IF;

  -- Insert profile record
  INSERT INTO public.profiles (user_id, name, email, company_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email,
    _company_id
  );

  -- If company_id present, add role for this user in that company
  IF _company_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, company_id, role)
    VALUES (
      NEW.id,
      _company_id,
      COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'sales')
    )
    ON CONFLICT (user_id, company_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users to call handle_new_user after insert (Supabase auth)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE p.proname = 'handle_new_user'
      AND t.tgname = 'trigger_handle_new_user_auth_users'
  ) THEN
    CREATE TRIGGER trigger_handle_new_user_auth_users
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
  END IF;
EXCEPTION WHEN undefined_table THEN
  -- If auth.users doesn't exist in this DB context, skip trigger creation
  RAISE NOTICE 'auth.users not found, skipping creation of signup trigger';
END;
$$;

-- 15) Row-Level Security Policies (company scoping + role-based)
-- Companies
CREATE POLICY "Users can view their company"
ON public.companies FOR SELECT
USING (id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Super admins can update their company"
ON public.companies FOR UPDATE
USING (id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Anyone can create a company during signup"
ON public.companies FOR INSERT
WITH CHECK (true);

-- Profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view profiles in their company"
ON public.profiles FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()) OR company_id IS NULL);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (user_id = auth.uid());

-- User roles
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

-- Leads
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

-- Properties
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

-- Follow-ups
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

-- Site visits
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

-- Messages
CREATE POLICY "Users can view messages in their company"
ON public.messages FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create messages in their company"
ON public.messages FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update messages"
ON public.messages FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

-- Workflows
CREATE POLICY "Users can view workflows in their company"
ON public.workflows FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage workflows"
ON public.workflows FOR ALL
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- 16) Optional: grant basic privileges to authenticated role (adjust as needed)
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, anon;

-- End of script
