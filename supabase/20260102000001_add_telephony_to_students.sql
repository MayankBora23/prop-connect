-- Add telephony fields to students table
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS is_telephony_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_called_at TIMESTAMP WITH TIME ZONE;

-- Add comments for the new columns
COMMENT ON COLUMN public.students.is_telephony_enabled IS 'Whether telephony is enabled for this student';
COMMENT ON COLUMN public.students.last_called_at IS 'Timestamp of the last call made to this student';

-- Update RLS policy to allow service_role to update students (for call logging)
DROP POLICY IF EXISTS "Users can update students" ON public.students;
CREATE POLICY "Users can update students"
ON public.students FOR UPDATE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND (
    public.has_role_level(auth.uid(), 'manager')
    OR assigned_to = auth.uid()
    OR auth.role() = 'service_role'
  )
);