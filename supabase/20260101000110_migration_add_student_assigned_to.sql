-- Add assigned_to column to students table for assignment functionality
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(user_id);

-- Add comment for the new column
COMMENT ON COLUMN public.students.assigned_to IS 'User assigned to manage this student';
