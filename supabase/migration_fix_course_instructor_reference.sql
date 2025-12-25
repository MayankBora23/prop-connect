-- Fix course instructor_id to reference teachers table instead of profiles
-- This migration updates the foreign key constraint

-- First, clear the instructor_id field for all courses since we're changing the reference
UPDATE public.courses SET instructor_id = NULL;

-- Then drop the existing constraint
ALTER TABLE public.courses
DROP CONSTRAINT IF EXISTS courses_instructor_id_fkey;

-- Update the instructor_id column to reference teachers table
ALTER TABLE public.courses
ADD CONSTRAINT courses_instructor_id_fkey
FOREIGN KEY (instructor_id) REFERENCES public.teachers(id) ON DELETE SET NULL;

-- Update the comment
COMMENT ON COLUMN public.courses.instructor_id IS 'Instructor assigned to this course (references teachers.id)';
