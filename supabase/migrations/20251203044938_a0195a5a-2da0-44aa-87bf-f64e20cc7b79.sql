-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'agent', 'telecaller');

-- Create enum for lead stages
CREATE TYPE public.lead_stage AS ENUM ('new', 'contacted', 'follow-up', 'site-visit', 'negotiation', 'closed-won', 'closed-lost');

-- Create enum for property status
CREATE TYPE public.property_status AS ENUM ('available', 'sold', 'upcoming');

-- Create enum for site visit status
CREATE TYPE public.site_visit_status AS ENUM ('scheduled', 'completed', 'cancelled');

-- Create enum for follow-up type
CREATE TYPE public.follow_up_type AS ENUM ('call', 'whatsapp', 'meeting', 'email');

-- Create enum for follow-up status
CREATE TYPE public.follow_up_status AS ENUM ('pending', 'completed', 'missed');

-- Create enum for message direction
CREATE TYPE public.message_direction AS ENUM ('incoming', 'outgoing');

-- Create enum for message status
CREATE TYPE public.message_status AS ENUM ('sent', 'delivered', 'read');

-- Create enum for message type
CREATE TYPE public.message_type AS ENUM ('text', 'image', 'document');

-- Create enum for workflow status
CREATE TYPE public.workflow_status AS ENUM ('active', 'inactive');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'agent',
  UNIQUE (user_id, role)
);

-- Create properties table
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  bhk TEXT NOT NULL,
  area TEXT NOT NULL,
  price TEXT NOT NULL,
  description TEXT,
  status property_status DEFAULT 'available' NOT NULL,
  images TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  budget TEXT,
  location TEXT,
  property_type TEXT,
  source TEXT,
  stage lead_stage DEFAULT 'new' NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  tags TEXT[] DEFAULT '{}',
  notes TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  last_contact TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create site_visits table
CREATE TABLE public.site_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  visit_date DATE NOT NULL,
  visit_time TEXT NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  status site_visit_status DEFAULT 'scheduled' NOT NULL,
  feedback TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create follow_ups table
CREATE TABLE public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  type follow_up_type NOT NULL,
  follow_up_date DATE NOT NULL,
  follow_up_time TEXT NOT NULL,
  notes TEXT,
  status follow_up_status DEFAULT 'pending' NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create messages table (WhatsApp)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  direction message_direction NOT NULL,
  status message_status DEFAULT 'sent' NOT NULL,
  message_type message_type DEFAULT 'text' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create workflows table
CREATE TABLE public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  action TEXT NOT NULL,
  status workflow_status DEFAULT 'active' NOT NULL,
  last_run TIMESTAMP WITH TIME ZONE,
  runs_count INTEGER DEFAULT 0 NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- User roles policies
CREATE POLICY "Users can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Properties policies
CREATE POLICY "Anyone can view properties" ON public.properties FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create properties" ON public.properties FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update properties" ON public.properties FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete properties" ON public.properties FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Leads policies (agents see assigned, managers/admins see all)
CREATE POLICY "Users can view leads" ON public.leads FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager') OR 
  assigned_to = auth.uid() OR
  created_by = auth.uid()
);
CREATE POLICY "Users can create leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update assigned leads" ON public.leads FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager') OR 
  assigned_to = auth.uid()
);
CREATE POLICY "Admins can delete leads" ON public.leads FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Site visits policies
CREATE POLICY "Users can view site visits" ON public.site_visits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create site visits" ON public.site_visits FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update site visits" ON public.site_visits FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete site visits" ON public.site_visits FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Follow-ups policies
CREATE POLICY "Users can view follow-ups" ON public.follow_ups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create follow-ups" ON public.follow_ups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update follow-ups" ON public.follow_ups FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete follow-ups" ON public.follow_ups FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Messages policies
CREATE POLICY "Users can view messages" ON public.messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update messages" ON public.messages FOR UPDATE TO authenticated USING (true);

-- Workflows policies
CREATE POLICY "Users can view workflows" ON public.workflows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage workflows" ON public.workflows FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'agent');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_site_visits_updated_at BEFORE UPDATE ON public.site_visits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_follow_ups_updated_at BEFORE UPDATE ON public.follow_ups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON public.workflows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;