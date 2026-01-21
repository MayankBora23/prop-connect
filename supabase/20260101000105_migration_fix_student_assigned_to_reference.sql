-- Fix student assigned_to to reference profiles table (team members)
-- This migration updates the foreign key constraint

-- First, clear the assigned_to field for all students since we're changing the reference
UPDATE public.students SET assigned_to = NULL;

-- Then drop the existing constraint
ALTER TABLE public.students
DROP CONSTRAINT IF EXISTS students_assigned_to_fkey;

-- Update the assigned_to column to reference profiles table (team members)
ALTER TABLE public.students
ADD CONSTRAINT students_assigned_to_fkey
FOREIGN KEY (assigned_to) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

-- Update the comment
COMMENT ON COLUMN public.students.assigned_to IS 'Team member assigned to manage this student (references profiles.user_id)';
