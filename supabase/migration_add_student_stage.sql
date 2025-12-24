-- Add student_stage column to students table
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'new_students'
CHECK (stage IN ('new_students', 'contacted', 'demo_scheduled', 'demo_attended', 'interested', 'fees_discussed', 'enrolled', 'lost'));

-- Add comment for the new column
COMMENT ON COLUMN public.students.stage IS 'Current stage of the student in the enrollment pipeline';
