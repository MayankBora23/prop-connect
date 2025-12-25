-- Fix enrollment teacher_id to reference teachers table instead of profiles
-- This migration updates the foreign key constraint

-- First, drop the existing constraint
ALTER TABLE public.enrollments
DROP CONSTRAINT IF EXISTS enrollments_teacher_id_fkey;

-- Update the teacher_id column to reference teachers table
ALTER TABLE public.enrollments
ADD CONSTRAINT enrollments_teacher_id_fkey
FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE SET NULL;

-- Update the comment
COMMENT ON COLUMN public.enrollments.teacher_id IS 'Teacher assigned to this enrollment (references teachers.id)';
