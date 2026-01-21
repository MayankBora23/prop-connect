-- Create attendance table for education CRM if it doesn't exist
-- This migration ensures the attendance table is created for batch-wise attendance marking

-- First ensure the attendance_status enums exist
DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('present', 'absent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE teacher_attendance_status AS ENUM ('present', 'half_day', 'absent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create attendance table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status attendance_status NOT NULL DEFAULT 'present',
  notes TEXT,
  marked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_enrollment_date ON public.attendance(enrollment_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_company_date ON public.attendance(company_id, attendance_date);

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
DROP TRIGGER IF EXISTS update_attendance_updated_at ON public.attendance;
CREATE TRIGGER update_attendance_updated_at
BEFORE UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create teacher attendance table if it doesn't exist
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

-- Create indexes for teacher attendance
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_teacher_date ON public.teacher_attendance(teacher_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_company_date ON public.teacher_attendance(company_id, attendance_date);

-- Enable RLS for teacher attendance
ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger for teacher attendance
DROP TRIGGER IF EXISTS update_teacher_attendance_updated_at ON public.teacher_attendance;
CREATE TRIGGER update_teacher_attendance_updated_at
BEFORE UPDATE ON public.teacher_attendance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
DROP POLICY IF EXISTS "Users can view attendance in their company" ON public.attendance;
CREATE POLICY "Users can view attendance in their company"
ON public.attendance FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Users can create attendance in their company" ON public.attendance;
CREATE POLICY "Users can create attendance in their company"
ON public.attendance FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Users can update attendance" ON public.attendance;
CREATE POLICY "Users can update attendance"
ON public.attendance FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete attendance" ON public.attendance;
CREATE POLICY "Admins can delete attendance"
ON public.attendance FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- RLS Policies for teacher attendance
DROP POLICY IF EXISTS "Users can view teacher attendance in their company" ON public.teacher_attendance;
CREATE POLICY "Users can view teacher attendance in their company"
ON public.teacher_attendance FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Users can create teacher attendance in their company" ON public.teacher_attendance;
CREATE POLICY "Users can create teacher attendance in their company"
ON public.teacher_attendance FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Users can update teacher attendance" ON public.teacher_attendance;
CREATE POLICY "Users can update teacher attendance"
ON public.teacher_attendance FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete teacher attendance" ON public.teacher_attendance;
CREATE POLICY "Admins can delete teacher attendance"
ON public.teacher_attendance FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- Comments
COMMENT ON TABLE public.attendance IS 'Attendance records for enrolled students';
COMMENT ON COLUMN public.attendance.enrollment_id IS 'Reference to the student enrollment';
COMMENT ON COLUMN public.attendance.attendance_date IS 'Date of attendance marking';
COMMENT ON COLUMN public.attendance.status IS 'Attendance status: present or absent';
COMMENT ON COLUMN public.attendance.marked_by IS 'User who marked the attendance';

COMMENT ON TABLE public.teacher_attendance IS 'Attendance records for teachers';
COMMENT ON COLUMN public.teacher_attendance.teacher_id IS 'Reference to the teacher';
COMMENT ON COLUMN public.teacher_attendance.attendance_date IS 'Date of attendance marking';
COMMENT ON COLUMN public.teacher_attendance.status IS 'Teacher attendance status: present, half_day, or absent';
COMMENT ON COLUMN public.teacher_attendance.marked_by IS 'User who marked the attendance';
