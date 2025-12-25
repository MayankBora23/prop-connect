-- Add new fields to courses table for education CRM
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS course_type TEXT DEFAULT 'offline'
CHECK (course_type IN ('online', 'offline', 'hybrid'));

ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS subjects_covered TEXT[] DEFAULT ARRAY[]::text[];

ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS max_students INTEGER;

ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
CHECK (status IN ('active', 'archived'));

-- Add comments for the new columns
COMMENT ON COLUMN public.courses.course_type IS 'Type of course delivery: online, offline, or hybrid';
COMMENT ON COLUMN public.courses.subjects_covered IS 'Array of subjects covered in this course';
COMMENT ON COLUMN public.courses.max_students IS 'Maximum number of students allowed in this course';
COMMENT ON COLUMN public.courses.status IS 'Status of the course: active or archived';
