-- Add patient stage enum
CREATE TYPE patient_stage AS ENUM (
  'new_patient_inquiry',
  'appointment_scheduled',
  'checked_in_visit_started',
  'consultation_treatment_completed',
  'billing_payment_pending',
  'payment_completed',
  'follow_up_scheduled'
);

-- Add missing fields to patients table
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS aadhar_number TEXT,
ADD COLUMN IF NOT EXISTS past_surgeries_history TEXT,
ADD COLUMN IF NOT EXISTS insurance_provider_name TEXT,
ADD COLUMN IF NOT EXISTS insurance_policy_id TEXT,
ADD COLUMN IF NOT EXISTS insurance_coverage_type TEXT,
ADD COLUMN IF NOT EXISTS insurance_validity_date DATE,
ADD COLUMN IF NOT EXISTS insurance_tpa_contact TEXT,
ADD COLUMN IF NOT EXISTS insurance_remarks TEXT,
ADD COLUMN IF NOT EXISTS stage patient_stage DEFAULT 'new_patient_inquiry' NOT NULL;

-- Add updated_at trigger for new fields
DROP TRIGGER IF EXISTS update_patients_updated_at ON public.patients;
CREATE TRIGGER update_patients_updated_at
BEFORE UPDATE ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
