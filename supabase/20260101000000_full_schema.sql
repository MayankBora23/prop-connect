-- Trimmed Full DB schema for RealCRM (real_estate, education, automobile)
-- Generated: keep only real_estate, education, automobile tables, enums, triggers, and policies

-- 1) Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2) Enums (kept for target industries)
DROP TYPE IF EXISTS public.app_role CASCADE;
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'manager', 'sales');

DROP TYPE IF EXISTS public.lead_status CASCADE;
CREATE TYPE public.lead_status AS ENUM ('hot', 'warm', 'cold');

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

-- industry_type: keep only the target industries
DROP TYPE IF EXISTS public.industry_type CASCADE;
CREATE TYPE public.industry_type AS ENUM ('real_estate', 'education', 'automobile_dealers');

DROP TYPE IF EXISTS public.enrollment_status CASCADE;
CREATE TYPE public.enrollment_status AS ENUM ('active', 'completed', 'cancelled', 'on_hold');

DROP TYPE IF EXISTS public.attendance_status CASCADE;
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent');

DROP TYPE IF EXISTS public.teacher_attendance_status CASCADE;
CREATE TYPE public.teacher_attendance_status AS ENUM ('present', 'half_day', 'absent');

DROP TYPE IF EXISTS public.assignment_status CASCADE;
CREATE TYPE public.assignment_status AS ENUM ('pending', 'submitted', 'graded', 'overdue');

DROP TYPE IF EXISTS public.exam_status CASCADE;
CREATE TYPE public.exam_status AS ENUM ('scheduled', 'completed', 'cancelled');

DROP TYPE IF EXISTS public.fee_status CASCADE;
CREATE TYPE public.fee_status AS ENUM ('pending', 'paid', 'overdue', 'partial');

DROP TYPE IF EXISTS public.vehicle_type CASCADE;
CREATE TYPE public.vehicle_type AS ENUM ('car', 'bike', 'used_car', 'used_bike');

DROP TYPE IF EXISTS public.fuel_type CASCADE;
CREATE TYPE public.fuel_type AS ENUM ('petrol', 'diesel', 'electric', 'hybrid', 'cng');

DROP TYPE IF EXISTS public.transmission_type CASCADE;
CREATE TYPE public.transmission_type AS ENUM ('manual', 'automatic', 'cvt', 'dct');

DROP TYPE IF EXISTS public.vehicle_status CASCADE;
CREATE TYPE public.vehicle_status AS ENUM ('available', 'sold', 'reserved', 'maintenance');

DROP TYPE IF EXISTS public.test_drive_status CASCADE;
CREATE TYPE public.test_drive_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');

DROP TYPE IF EXISTS public.quote_status CASCADE;
CREATE TYPE public.quote_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');

DROP TYPE IF EXISTS public.deal_status CASCADE;
CREATE TYPE public.deal_status AS ENUM ('pending', 'approved', 'completed', 'cancelled');

DROP TYPE IF EXISTS public.finance_status CASCADE;
CREATE TYPE public.finance_status AS ENUM ('applied', 'approved', 'rejected', 'disbursed');

DROP TYPE IF EXISTS public.insurance_sale_status CASCADE;
CREATE TYPE public.insurance_sale_status AS ENUM ('quoted', 'sold', 'cancelled');

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
  industry industry_type NOT NULL DEFAULT 'real_estate',
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

-- 7) Leads (real estate)
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  location TEXT,
  property_type TEXT,
  budget TEXT,
  source TEXT,
  notes TEXT[] DEFAULT ARRAY[]::text[],
  tags TEXT[] DEFAULT ARRAY[]::text[],
  stage lead_stage NOT NULL DEFAULT 'new',
  lead_status lead_status DEFAULT 'cold',
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

-- 13-22) Education tables (students, courses, batches, enrollments, attendance, teacher_attendance, assignments, assignment_submissions, exams, exam_results, fees)
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  date_of_birth DATE,
  address TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  notes TEXT[] DEFAULT ARRAY[]::text[],
  tags TEXT[] DEFAULT ARRAY[]::text[],
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_students_updated_at
BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  duration_months INTEGER,
  price TEXT,
  instructor_id UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_courses_updated_at
BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  schedule TEXT,
  max_students INTEGER,
  instructor_id UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_batches_updated_at
BEFORE UPDATE ON public.batches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status enrollment_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_enrollments_updated_at
BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status attendance_status NOT NULL DEFAULT 'present',
  notes TEXT,
  marked_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_attendance_updated_at
BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.teacher_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  attendance_date DATE NOT NULL,
  status teacher_attendance_status NOT NULL DEFAULT 'present',
  notes TEXT,
  marked_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);
ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_teacher_attendance_updated_at
BEFORE UPDATE ON public.teacher_attendance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  max_marks INTEGER,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_assignments_updated_at
BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  submission_date DATE,
  status assignment_status NOT NULL DEFAULT 'pending',
  marks_obtained INTEGER,
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_assignment_submissions_updated_at
BEFORE UPDATE ON public.assignment_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  exam_date DATE NOT NULL,
  exam_time TIME,
  duration_minutes INTEGER,
  max_marks INTEGER,
  instructions TEXT,
  status exam_status NOT NULL DEFAULT 'scheduled',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_exams_updated_at
BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  marks_obtained INTEGER,
  percentage DECIMAL(5,2),
  grade TEXT,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_exam_results_updated_at
BEFORE UPDATE ON public.exam_results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  fee_type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status fee_status NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  transaction_id TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_fees_updated_at
BEFORE UPDATE ON public.fees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 29-36) Automobile tables (vehicles, vehicle_images, auto_leads, test_drives, quotes, deals, finance_applications, insurance_sales)
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_type vehicle_type NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  variant TEXT,
  year INTEGER NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  fuel_type fuel_type NOT NULL,
  transmission transmission_type NOT NULL,
  mileage INTEGER,
  engine_capacity TEXT,
  seating_capacity INTEGER,
  color TEXT,
  vin TEXT UNIQUE,
  stock_number TEXT,
  description TEXT,
  specifications JSONB DEFAULT '{}',
  status vehicle_status NOT NULL DEFAULT 'available',
  location TEXT,
  images TEXT[] DEFAULT ARRAY[]::text[],
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_vehicles_updated_at
BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.vehicle_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_type TEXT DEFAULT 'exterior',
  is_primary BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);
ALTER TABLE public.vehicle_images ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.auto_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  preferred_vehicle_type vehicle_type,
  preferred_brand TEXT,
  preferred_model TEXT,
  budget_min DECIMAL(12,2),
  budget_max DECIMAL(12,2),
  financing_needed BOOLEAN DEFAULT false,
  insurance_needed BOOLEAN DEFAULT false,
  test_drive_requested BOOLEAN DEFAULT false,
  source TEXT,
  status TEXT DEFAULT 'new',
  notes TEXT[] DEFAULT ARRAY[]::text[],
  tags TEXT[] DEFAULT ARRAY[]::text[],
  assigned_to UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_contact TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);
ALTER TABLE public.auto_leads ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_auto_leads_updated_at
BEFORE UPDATE ON public.auto_leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.test_drives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.auto_leads(id) ON DELETE SET NULL,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_name TEXT NOT NULL,
  driver_phone TEXT NOT NULL,
  driver_license TEXT,
  test_drive_date DATE NOT NULL,
  test_drive_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status test_drive_status NOT NULL DEFAULT 'scheduled',
  feedback TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  assigned_to UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);
ALTER TABLE public.test_drives ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_test_drives_updated_at
BEFORE UPDATE ON public.test_drives FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.auto_leads(id) ON DELETE SET NULL,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  quote_number TEXT UNIQUE,
  vehicle_price DECIMAL(12,2) NOT NULL,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  accessories_cost DECIMAL(12,2) DEFAULT 0,
  registration_cost DECIMAL(12,2) DEFAULT 0,
  insurance_cost DECIMAL(12,2) DEFAULT 0,
  finance_cost DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  status quote_status NOT NULL DEFAULT 'draft',
  valid_until DATE,
  notes TEXT,
  terms_conditions TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_quotes_updated_at
BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.auto_leads(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  deal_number TEXT UNIQUE,
  final_price DECIMAL(12,2) NOT NULL,
  down_payment DECIMAL(12,2) DEFAULT 0,
  financed_amount DECIMAL(12,2) DEFAULT 0,
  status deal_status NOT NULL DEFAULT 'pending',
  delivery_date DATE,
  payment_terms TEXT,
  special_conditions TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_deals_updated_at
BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.finance_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.auto_leads(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  application_number TEXT UNIQUE,
  applicant_name TEXT NOT NULL,
  applicant_phone TEXT NOT NULL,
  applicant_email TEXT,
  monthly_income DECIMAL(12,2),
  employment_type TEXT,
  requested_amount DECIMAL(12,2) NOT NULL,
  tenure_months INTEGER NOT NULL,
  interest_rate DECIMAL(5,2),
  emi_amount DECIMAL(10,2),
  status finance_status NOT NULL DEFAULT 'applied',
  bank_name TEXT,
  approval_date DATE,
  disbursement_date DATE,
  remarks TEXT,
  documents_required TEXT[] DEFAULT ARRAY[]::text[],
  documents_submitted TEXT[] DEFAULT ARRAY[]::text[],
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);
ALTER TABLE public.finance_applications ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_finance_applications_updated_at
BEFORE UPDATE ON public.finance_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.insurance_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.auto_leads(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  policy_number TEXT UNIQUE,
  insurance_type TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  coverage_amount DECIMAL(12,2) NOT NULL,
  premium_amount DECIMAL(10,2) NOT NULL,
  policy_term_months INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status insurance_sale_status NOT NULL DEFAULT 'quoted',
  commission_amount DECIMAL(10,2),
  agent_name TEXT,
  remarks TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);
ALTER TABLE public.insurance_sales ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_insurance_sales_updated_at
BEFORE UPDATE ON public.insurance_sales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper functions (company/role lookups)
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

-- Signup / user onboarding function: create profile (+ optionally company & role)
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
  _industry industry_type;
BEGIN
  -- Attempt to read company metadata from NEW.raw_user_meta_data (supabase auth metadata)
  BEGIN
    _company_name := NEW.raw_user_meta_data ->> 'company_name';
    _company_email := NEW.raw_user_meta_data ->> 'company_email';
    _company_id := (NEW.raw_user_meta_data ->> 'company_id')::UUID;
    _industry := COALESCE((NEW.raw_user_meta_data ->> 'industry')::industry_type, 'real_estate'::industry_type);
  EXCEPTION WHEN others THEN
    _company_name := NULL;
    _company_email := NULL;
    _company_id := NULL;
    _industry := 'real_estate'::industry_type;
  END;

  -- If registering a new company (company_name provided but no company_id), create it
  IF _company_name IS NOT NULL AND _company_id IS NULL THEN
    INSERT INTO public.companies (name, email, industry)
    VALUES (_company_name, COALESCE(_company_email, NEW.email), _industry)
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

-- Row-Level Security Policies (company scoping + role-based) for retained tables
CREATE POLICY "Users can view their company"
ON public.companies FOR SELECT
USING (id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Super admins can update their company"
ON public.companies FOR UPDATE
USING (id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Anyone can create a company during signup"
ON public.companies FOR INSERT
WITH CHECK (true);

-- Profiles policies
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

-- User roles policies
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

-- Leads policies
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

-- Properties policies
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

-- Follow-ups policies
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

-- Messages policies
CREATE POLICY "Users can view messages in their company"
ON public.messages FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create messages in their company"
ON public.messages FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update messages"
ON public.messages FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

-- Site visits policies
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

-- Education policies (students, courses, batches, enrollments, attendance, fees, etc.)
CREATE POLICY "Users can view students in their company"
ON public.students FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create students in their company"
ON public.students FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update students"
ON public.students FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete students"
ON public.students FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- (similar policies for courses, batches, enrollments, attendance, assignments, exams, fees)
CREATE POLICY "Users can view courses in their company" ON public.courses FOR SELECT USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Users can create courses in their company" ON public.courses FOR INSERT WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Users can view enrollments in their company" ON public.enrollments FOR SELECT USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Users can create enrollments in their company" ON public.enrollments FOR INSERT WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Users can view attendance in their company" ON public.attendance FOR SELECT USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Users can create attendance in their company" ON public.attendance FOR INSERT WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Users can view fees in their company" ON public.fees FOR SELECT USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Users can create fees in their company" ON public.fees FOR INSERT WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- Automobile policies (vehicles, auto_leads, test_drives, quotes, deals, finance applications, insurance sales)
CREATE POLICY "Users can view vehicles in their company" ON public.vehicles FOR SELECT USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Users can create vehicles in their company" ON public.vehicles FOR INSERT WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Users can update vehicles" ON public.vehicles FOR UPDATE USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Admins can delete vehicles" ON public.vehicles FOR DELETE USING (company_id = public.get_user_company_id(auth.uid()) AND public.has_role_level(auth.uid(), 'admin'));

CREATE POLICY "Users can view auto leads in their company" ON public.auto_leads FOR SELECT USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Users can create auto leads in their company" ON public.auto_leads FOR INSERT WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can view test drives in their company" ON public.test_drives FOR SELECT USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Users can create test drives in their company" ON public.test_drives FOR INSERT WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can view quotes in their company" ON public.quotes FOR SELECT USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Users can create quotes in their company" ON public.quotes FOR INSERT WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can view deals in their company" ON public.deals FOR SELECT USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Users can create deals in their company" ON public.deals FOR INSERT WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- 16) Optional: grant basic privileges to authenticated role (adjust as needed)
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, anon;

-- End of trimmed schema

