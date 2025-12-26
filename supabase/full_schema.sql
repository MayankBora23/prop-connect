-- Full DB schema for Prop Connect (create / run in Supabase SQL editor)

-- 1) Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2) Enums
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

DROP TYPE IF EXISTS public.industry_type CASCADE;
CREATE TYPE public.industry_type AS ENUM ('real_estate', 'education', 'healthcare', 'automobile_dealers', 'online_business');

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

DROP TYPE IF EXISTS public.appointment_status CASCADE;
CREATE TYPE public.appointment_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');

DROP TYPE IF EXISTS public.billing_status CASCADE;
CREATE TYPE public.billing_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled', 'refunded');

DROP TYPE IF EXISTS public.insurance_status CASCADE;
CREATE TYPE public.insurance_status AS ENUM ('active', 'expired', 'cancelled');

DROP TYPE IF EXISTS public.vehicle_type CASCADE;
CREATE TYPE public.vehicle_type AS ENUM ('car', 'bike');

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

DROP TYPE IF EXISTS public.barcode_type CASCADE;
CREATE TYPE public.barcode_type AS ENUM ('EAN', 'UPC', 'CODE128', 'QR');

DROP TYPE IF EXISTS public.order_status CASCADE;
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');

DROP TYPE IF EXISTS public.payment_status CASCADE;
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

DROP TYPE IF EXISTS public.payment_method CASCADE;
CREATE TYPE public.payment_method AS ENUM ('cash', 'card', 'upi', 'net_banking', 'wallet', 'cod');

DROP TYPE IF EXISTS public.return_status CASCADE;
CREATE TYPE public.return_status AS ENUM ('requested', 'approved', 'received', 'refunded', 'rejected');

DROP TYPE IF EXISTS public.discount_type CASCADE;
CREATE TYPE public.discount_type AS ENUM ('percentage', 'fixed_amount');

DROP TYPE IF EXISTS public.product_status CASCADE;
CREATE TYPE public.product_status AS ENUM ('active', 'inactive', 'discontinued');

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

-- 7) Leads
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

-- 13) Education: Students table
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
DROP TRIGGER IF EXISTS update_students_updated_at ON public.students;
CREATE TRIGGER update_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 14) Education: Courses table
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
DROP TRIGGER IF EXISTS update_courses_updated_at ON public.courses;
CREATE TRIGGER update_courses_updated_at
BEFORE UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 15) Education: Batches table
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
DROP TRIGGER IF EXISTS update_batches_updated_at ON public.batches;
CREATE TRIGGER update_batches_updated_at
BEFORE UPDATE ON public.batches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 16) Education: Enrollments table
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
DROP TRIGGER IF EXISTS update_enrollments_updated_at ON public.enrollments;
CREATE TRIGGER update_enrollments_updated_at
BEFORE UPDATE ON public.enrollments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 17) Education: Attendance table
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
DROP TRIGGER IF EXISTS update_attendance_updated_at ON public.attendance;
CREATE TRIGGER update_attendance_updated_at
BEFORE UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 17.1) Education: Teacher Attendance table
CREATE TABLE IF NOT EXISTS public.teacher_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status teacher_attendance_status NOT NULL DEFAULT 'present',
  notes TEXT,
  marked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);

ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS update_teacher_attendance_updated_at ON public.teacher_attendance;
CREATE TRIGGER update_teacher_attendance_updated_at
BEFORE UPDATE ON public.teacher_attendance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 18) Education: Assignments table
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
DROP TRIGGER IF EXISTS update_assignments_updated_at ON public.assignments;
CREATE TRIGGER update_assignments_updated_at
BEFORE UPDATE ON public.assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 19) Education: Assignment Submissions table
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
DROP TRIGGER IF EXISTS update_assignment_submissions_updated_at ON public.assignment_submissions;
CREATE TRIGGER update_assignment_submissions_updated_at
BEFORE UPDATE ON public.assignment_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 20) Education: Exams table
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
DROP TRIGGER IF EXISTS update_exams_updated_at ON public.exams;
CREATE TRIGGER update_exams_updated_at
BEFORE UPDATE ON public.exams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 21) Education: Exam Results table
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
DROP TRIGGER IF EXISTS update_exam_results_updated_at ON public.exam_results;
CREATE TRIGGER update_exam_results_updated_at
BEFORE UPDATE ON public.exam_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 22) Education: Fees table
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
DROP TRIGGER IF EXISTS update_fees_updated_at ON public.fees;
CREATE TRIGGER update_fees_updated_at
BEFORE UPDATE ON public.fees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 23) Healthcare: Patients table
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  date_of_birth DATE,
  address TEXT,
  medical_id TEXT UNIQUE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  blood_type TEXT,
  allergies TEXT[] DEFAULT ARRAY[]::text[],
  medical_conditions TEXT[] DEFAULT ARRAY[]::text[],
  notes TEXT,
  tags TEXT[] DEFAULT ARRAY[]::text[],
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS update_patients_updated_at ON public.patients;
CREATE TRIGGER update_patients_updated_at
BEFORE UPDATE ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 24) Healthcare: Appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_name TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  appointment_type TEXT NOT NULL,
  status appointment_status NOT NULL DEFAULT 'scheduled',
  symptoms TEXT,
  diagnosis TEXT,
  treatment TEXT,
  notes TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 25) Healthcare: Medical Records table
CREATE TABLE IF NOT EXISTS public.medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  record_date DATE NOT NULL,
  record_type TEXT NOT NULL,
  title TEXT NOT NULL,
  diagnosis TEXT,
  symptoms TEXT,
  treatment TEXT,
  medications_prescribed TEXT[],
  test_results TEXT,
  attachments TEXT[] DEFAULT ARRAY[]::text[],
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);

ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS update_medical_records_updated_at ON public.medical_records;
CREATE TRIGGER update_medical_records_updated_at
BEFORE UPDATE ON public.medical_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 26) Healthcare: Prescriptions table
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration_days INTEGER,
  instructions TEXT,
  prescribed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  refills_allowed INTEGER DEFAULT 0,
  refills_used INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS update_prescriptions_updated_at ON public.prescriptions;
CREATE TRIGGER update_prescriptions_updated_at
BEFORE UPDATE ON public.prescriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 27) Healthcare: Billing table
CREATE TABLE IF NOT EXISTS public.billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  invoice_number TEXT UNIQUE,
  service_description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  status billing_status NOT NULL DEFAULT 'pending',
  due_date DATE,
  payment_date DATE,
  payment_method TEXT,
  insurance_claimed BOOLEAN DEFAULT false,
  insurance_amount DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);

ALTER TABLE public.billing ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS update_billing_updated_at ON public.billing;
CREATE TRIGGER update_billing_updated_at
BEFORE UPDATE ON public.billing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 28) Healthcare: Insurance Details table
CREATE TABLE IF NOT EXISTS public.insurance_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL,
  policy_number TEXT NOT NULL,
  coverage_type TEXT NOT NULL,
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  status insurance_status NOT NULL DEFAULT 'active',
  coverage_percentage INTEGER DEFAULT 100,
  max_coverage_amount DECIMAL(10,2),
  deductible_amount DECIMAL(10,2),
  co_payment_amount DECIMAL(10,2),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  UNIQUE(patient_id, policy_number)
);

ALTER TABLE public.insurance_details ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS update_insurance_details_updated_at ON public.insurance_details;
CREATE TRIGGER update_insurance_details_updated_at
BEFORE UPDATE ON public.insurance_details
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 29) Automobile Dealers: Vehicles table
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
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON public.vehicles;
CREATE TRIGGER update_vehicles_updated_at
BEFORE UPDATE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 30) Automobile Dealers: Vehicle Images table
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

-- 31) Automobile Dealers: Leads table
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
DROP TRIGGER IF EXISTS update_auto_leads_updated_at ON public.auto_leads;
CREATE TRIGGER update_auto_leads_updated_at
BEFORE UPDATE ON public.auto_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 32) Automobile Dealers: Test Drives table
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
DROP TRIGGER IF EXISTS update_test_drives_updated_at ON public.test_drives;
CREATE TRIGGER update_test_drives_updated_at
BEFORE UPDATE ON public.test_drives
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 33) Automobile Dealers: Quotes table
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
DROP TRIGGER IF EXISTS update_quotes_updated_at ON public.quotes;
CREATE TRIGGER update_quotes_updated_at
BEFORE UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 34) Automobile Dealers: Deals table
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
DROP TRIGGER IF EXISTS update_deals_updated_at ON public.deals;
CREATE TRIGGER update_deals_updated_at
BEFORE UPDATE ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 35) Automobile Dealers: Finance Applications table
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
DROP TRIGGER IF EXISTS update_finance_applications_updated_at ON public.finance_applications;
CREATE TRIGGER update_finance_applications_updated_at
BEFORE UPDATE ON public.finance_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 36) Automobile Dealers: Insurance Sales table
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
DROP TRIGGER IF EXISTS update_insurance_sales_updated_at ON public.insurance_sales;
CREATE TRIGGER update_insurance_sales_updated_at
BEFORE UPDATE ON public.insurance_sales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 37) Online Business: Customers table
CREATE TABLE IF NOT EXISTS public.online_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  date_of_birth DATE,
  gender TEXT,
  customer_group TEXT DEFAULT 'regular',
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  last_order_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  tags TEXT[] DEFAULT ARRAY[]::text[],
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);

ALTER TABLE public.online_customers ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS update_online_customers_updated_at ON public.online_customers;
CREATE TRIGGER update_online_customers_updated_at
BEFORE UPDATE ON public.online_customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 38) Online Business: Suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  gst_number TEXT,
  payment_terms TEXT,
  credit_limit DECIMAL(12,2),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 39) Online Business: Products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT UNIQUE,
  barcode TEXT,
  category TEXT,
  brand TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2),
  mrp DECIMAL(10,2),
  weight DECIMAL(8,3),
  dimensions TEXT,
  status product_status NOT NULL DEFAULT 'active',
  is_featured BOOLEAN DEFAULT false,
  is_digital BOOLEAN DEFAULT false,
  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  images TEXT[] DEFAULT ARRAY[]::text[],
  tags TEXT[] DEFAULT ARRAY[]::text[],
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 40) Online Business: Product Variants table
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,
  variant_value TEXT NOT NULL,
  sku TEXT UNIQUE,
  additional_price DECIMAL(10,2) DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS update_product_variants_updated_at ON public.product_variants;
CREATE TRIGGER update_product_variants_updated_at
BEFORE UPDATE ON public.product_variants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 41) Online Business: Inventory table
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  warehouse_location TEXT,
  batch_number TEXT,
  expiry_date DATE,
  quantity INTEGER NOT NULL,
  reserved_quantity INTEGER DEFAULT 0,
  available_quantity INTEGER GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  purchase_price DECIMAL(10,2),
  purchase_date DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  CONSTRAINT inventory_quantity_check CHECK (quantity >= 0),
  CONSTRAINT inventory_reserved_check CHECK (reserved_quantity >= 0)
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS update_inventory_updated_at ON public.inventory;
CREATE TRIGGER update_inventory_updated_at
BEFORE UPDATE ON public.inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 42) Online Business: Discounts table
CREATE TABLE IF NOT EXISTS public.discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  discount_type discount_type NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  minimum_purchase DECIMAL(10,2),
  maximum_discount DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  applicable_products UUID[] DEFAULT ARRAY[]::uuid[],
  applicable_categories TEXT[] DEFAULT ARRAY[]::text[],
  coupon_code TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);

ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS update_discounts_updated_at ON public.discounts;
CREATE TRIGGER update_discounts_updated_at
BEFORE UPDATE ON public.discounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 43) Online Business: Sales Orders table
CREATE TABLE IF NOT EXISTS public.sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE,
  customer_id UUID REFERENCES public.online_customers(id) ON DELETE SET NULL,
  order_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status order_status NOT NULL DEFAULT 'pending',
  subtotal DECIMAL(12,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  shipping_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  payment_method payment_method,
  payment_status payment_status DEFAULT 'pending',
  shipping_address TEXT,
  billing_address TEXT,
  notes TEXT,
  discount_id UUID REFERENCES public.discounts(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);

ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS update_sales_orders_updated_at ON public.sales_orders;
CREATE TRIGGER update_sales_orders_updated_at
BEFORE UPDATE ON public.sales_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 44) Online Business: Order Items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_price DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 45) Online Business: Payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  payment_method payment_method NOT NULL,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  transaction_id TEXT,
  payment_gateway TEXT,
  payment_date TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 46) Online Business: Returns table
CREATE TABLE IF NOT EXISTS public.returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  return_number TEXT UNIQUE,
  return_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status return_status NOT NULL DEFAULT 'requested',
  return_reason TEXT,
  refund_amount DECIMAL(12,2),
  refund_status payment_status DEFAULT 'pending',
  return_items JSONB DEFAULT '[]',
  notes TEXT,
  approved_by UUID,
  approved_date TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);

ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS update_returns_updated_at ON public.returns;
CREATE TRIGGER update_returns_updated_at
BEFORE UPDATE ON public.returns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 47) Online Business: Barcodes table
CREATE TABLE IF NOT EXISTS public.barcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  barcode_value TEXT NOT NULL,
  barcode_type barcode_type NOT NULL,
  barcode_image_url TEXT,
  generated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  UNIQUE(product_id, barcode_type)
);

ALTER TABLE public.barcodes ENABLE ROW LEVEL SECURITY;

-- 23) Helper functions (company/role lookups)
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

-- Education: Students
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

-- Education: Courses
CREATE POLICY "Users can view courses in their company"
ON public.courses FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create courses in their company"
ON public.courses FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Managers can update courses"
ON public.courses FOR UPDATE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'manager')
);

CREATE POLICY "Admins can delete courses"
ON public.courses FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Education: Batches
CREATE POLICY "Users can view batches in their company"
ON public.batches FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create batches in their company"
ON public.batches FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update batches"
ON public.batches FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete batches"
ON public.batches FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Education: Enrollments
CREATE POLICY "Users can view enrollments in their company"
ON public.enrollments FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create enrollments in their company"
ON public.enrollments FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update enrollments"
ON public.enrollments FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete enrollments"
ON public.enrollments FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Education: Attendance
CREATE POLICY "Users can view attendance in their company"
ON public.attendance FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create attendance in their company"
ON public.attendance FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update attendance"
ON public.attendance FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete attendance"
ON public.attendance FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Education: Teacher Attendance
CREATE POLICY "Users can view teacher attendance in their company"
ON public.teacher_attendance FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create teacher attendance in their company"
ON public.teacher_attendance FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update teacher attendance"
ON public.teacher_attendance FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete teacher attendance"
ON public.teacher_attendance FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Education: Assignments
CREATE POLICY "Users can view assignments in their company"
ON public.assignments FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create assignments in their company"
ON public.assignments FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update assignments"
ON public.assignments FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete assignments"
ON public.assignments FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Education: Assignment Submissions
CREATE POLICY "Users can view assignment submissions in their company"
ON public.assignment_submissions FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create assignment submissions in their company"
ON public.assignment_submissions FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update assignment submissions"
ON public.assignment_submissions FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete assignment submissions"
ON public.assignment_submissions FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Education: Exams
CREATE POLICY "Users can view exams in their company"
ON public.exams FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create exams in their company"
ON public.exams FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update exams"
ON public.exams FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete exams"
ON public.exams FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Education: Exam Results
CREATE POLICY "Users can view exam results in their company"
ON public.exam_results FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create exam results in their company"
ON public.exam_results FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update exam results"
ON public.exam_results FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete exam results"
ON public.exam_results FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Education: Fees
CREATE POLICY "Users can view fees in their company"
ON public.fees FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create fees in their company"
ON public.fees FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update fees"
ON public.fees FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete fees"
ON public.fees FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Healthcare: Patients
CREATE POLICY "Users can view patients in their company"
ON public.patients FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create patients in their company"
ON public.patients FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update patients"
ON public.patients FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete patients"
ON public.patients FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Healthcare: Appointments
CREATE POLICY "Users can view appointments in their company"
ON public.appointments FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create appointments in their company"
ON public.appointments FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update appointments"
ON public.appointments FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete appointments"
ON public.appointments FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Healthcare: Medical Records
CREATE POLICY "Users can view medical records in their company"
ON public.medical_records FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create medical records in their company"
ON public.medical_records FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update medical records"
ON public.medical_records FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete medical records"
ON public.medical_records FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Healthcare: Prescriptions
CREATE POLICY "Users can view prescriptions in their company"
ON public.prescriptions FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create prescriptions in their company"
ON public.prescriptions FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update prescriptions"
ON public.prescriptions FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete prescriptions"
ON public.prescriptions FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Healthcare: Billing
CREATE POLICY "Users can view billing in their company"
ON public.billing FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create billing in their company"
ON public.billing FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update billing"
ON public.billing FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete billing"
ON public.billing FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Healthcare: Insurance Details
CREATE POLICY "Users can view insurance details in their company"
ON public.insurance_details FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create insurance details in their company"
ON public.insurance_details FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update insurance details"
ON public.insurance_details FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete insurance details"
ON public.insurance_details FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Automobile Dealers: Vehicles
CREATE POLICY "Users can view vehicles in their company"
ON public.vehicles FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create vehicles in their company"
ON public.vehicles FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update vehicles"
ON public.vehicles FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete vehicles"
ON public.vehicles FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Automobile Dealers: Vehicle Images
CREATE POLICY "Users can view vehicle images in their company"
ON public.vehicle_images FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create vehicle images in their company"
ON public.vehicle_images FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update vehicle images"
ON public.vehicle_images FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete vehicle images"
ON public.vehicle_images FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Automobile Dealers: Auto Leads
CREATE POLICY "Users can view auto leads in their company"
ON public.auto_leads FOR SELECT
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND (
    public.has_role_level(auth.uid(), 'manager')
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  )
);

CREATE POLICY "Users can create auto leads in their company"
ON public.auto_leads FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update auto leads"
ON public.auto_leads FOR UPDATE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND (
    public.has_role_level(auth.uid(), 'manager')
    OR assigned_to = auth.uid()
  )
);

CREATE POLICY "Admins can delete auto leads"
ON public.auto_leads FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Automobile Dealers: Test Drives
CREATE POLICY "Users can view test drives in their company"
ON public.test_drives FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create test drives in their company"
ON public.test_drives FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update test drives"
ON public.test_drives FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete test drives"
ON public.test_drives FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Automobile Dealers: Quotes
CREATE POLICY "Users can view quotes in their company"
ON public.quotes FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create quotes in their company"
ON public.quotes FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update quotes"
ON public.quotes FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete quotes"
ON public.quotes FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Automobile Dealers: Deals
CREATE POLICY "Users can view deals in their company"
ON public.deals FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create deals in their company"
ON public.deals FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update deals"
ON public.deals FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete deals"
ON public.deals FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Automobile Dealers: Finance Applications
CREATE POLICY "Users can view finance applications in their company"
ON public.finance_applications FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create finance applications in their company"
ON public.finance_applications FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update finance applications"
ON public.finance_applications FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete finance applications"
ON public.finance_applications FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Automobile Dealers: Insurance Sales
CREATE POLICY "Users can view insurance sales in their company"
ON public.insurance_sales FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create insurance sales in their company"
ON public.insurance_sales FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update insurance sales"
ON public.insurance_sales FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete insurance sales"
ON public.insurance_sales FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Online Business: Online Customers
CREATE POLICY "Users can view online customers in their company"
ON public.online_customers FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create online customers in their company"
ON public.online_customers FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update online customers"
ON public.online_customers FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete online customers"
ON public.online_customers FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Online Business: Suppliers
CREATE POLICY "Users can view suppliers in their company"
ON public.suppliers FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create suppliers in their company"
ON public.suppliers FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update suppliers"
ON public.suppliers FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete suppliers"
ON public.suppliers FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Online Business: Products
CREATE POLICY "Users can view products in their company"
ON public.products FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create products in their company"
ON public.products FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update products"
ON public.products FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete products"
ON public.products FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Online Business: Product Variants
CREATE POLICY "Users can view product variants in their company"
ON public.product_variants FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create product variants in their company"
ON public.product_variants FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update product variants"
ON public.product_variants FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete product variants"
ON public.product_variants FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Online Business: Inventory
CREATE POLICY "Users can view inventory in their company"
ON public.inventory FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create inventory in their company"
ON public.inventory FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update inventory"
ON public.inventory FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete inventory"
ON public.inventory FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Online Business: Discounts
CREATE POLICY "Users can view discounts in their company"
ON public.discounts FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create discounts in their company"
ON public.discounts FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update discounts"
ON public.discounts FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete discounts"
ON public.discounts FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Online Business: Sales Orders
CREATE POLICY "Users can view sales orders in their company"
ON public.sales_orders FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create sales orders in their company"
ON public.sales_orders FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update sales orders"
ON public.sales_orders FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete sales orders"
ON public.sales_orders FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Online Business: Order Items
CREATE POLICY "Users can view order items in their company"
ON public.order_items FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create order items in their company"
ON public.order_items FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update order items"
ON public.order_items FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

-- Online Business: Payments
CREATE POLICY "Users can view payments in their company"
ON public.payments FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create payments in their company"
ON public.payments FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update payments"
ON public.payments FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete payments"
ON public.payments FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Online Business: Returns
CREATE POLICY "Users can view returns in their company"
ON public.returns FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create returns in their company"
ON public.returns FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update returns"
ON public.returns FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete returns"
ON public.returns FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Online Business: Barcodes
CREATE POLICY "Users can view barcodes in their company"
ON public.barcodes FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create barcodes in their company"
ON public.barcodes FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update barcodes"
ON public.barcodes FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete barcodes"
ON public.barcodes FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- 16) Optional: grant basic privileges to authenticated role (adjust as needed)
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, anon;

-- End of script
