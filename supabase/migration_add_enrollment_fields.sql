-- Add new fields to enrollments table for education CRM
ALTER TABLE public.enrollments
ADD COLUMN IF NOT EXISTS total_fees DECIMAL(10,2) DEFAULT 0;

ALTER TABLE public.enrollments
ADD COLUMN IF NOT EXISTS fees_paid DECIMAL(10,2) DEFAULT 0;

ALTER TABLE public.enrollments
ADD COLUMN IF NOT EXISTS fees_pending DECIMAL(10,2) DEFAULT 0;

ALTER TABLE public.enrollments
ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.profiles(user_id);

-- Update status constraint to only allow active and completed
ALTER TABLE public.enrollments
DROP CONSTRAINT IF EXISTS enrollments_status_check;

ALTER TABLE public.enrollments
ADD CONSTRAINT enrollments_status_check
CHECK (status IN ('active', 'completed'));

-- Add comments for the new columns
COMMENT ON COLUMN public.enrollments.total_fees IS 'Total course fees for this enrollment';
COMMENT ON COLUMN public.enrollments.fees_paid IS 'Amount of fees paid by the student';
COMMENT ON COLUMN public.enrollments.fees_pending IS 'Remaining fees to be paid';
COMMENT ON COLUMN public.enrollments.teacher_id IS 'Teacher assigned to this enrollment';
