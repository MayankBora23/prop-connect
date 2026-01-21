-- Fix batch instructor_id to reference teachers table
-- This migration updates the foreign key constraint

-- First, clear the instructor_id field for all batches since we're changing the reference
UPDATE public.batches SET instructor_id = NULL;

-- Then drop the existing constraint if it exists
ALTER TABLE public.batches
DROP CONSTRAINT IF EXISTS batches_instructor_id_fkey;

-- Update the instructor_id column to reference teachers table
ALTER TABLE public.batches
ADD CONSTRAINT batches_instructor_id_fkey
FOREIGN KEY (instructor_id) REFERENCES public.teachers(id) ON DELETE SET NULL;

-- Update the comment
COMMENT ON COLUMN public.batches.instructor_id IS 'Instructor assigned to this batch (references teachers.id)';
