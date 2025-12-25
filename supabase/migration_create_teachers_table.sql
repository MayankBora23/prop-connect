-- Create teachers table for education CRM
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  qualifications TEXT[] DEFAULT ARRAY[]::text[],
  subjects TEXT[] DEFAULT ARRAY[]::text[],
  experience_years INTEGER,
  specialization TEXT,
  joining_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  salary DECIMAL(10,2),
  address TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);

-- Create updated_at trigger
DROP TRIGGER IF EXISTS update_teachers_updated_at ON public.teachers;
CREATE TRIGGER update_teachers_updated_at
BEFORE UPDATE ON public.teachers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view teachers in their company"
ON public.teachers FOR SELECT
USING (company_id IN (
  SELECT id FROM public.companies WHERE id = company_id
));

CREATE POLICY "Users can create teachers in their company"
ON public.teachers FOR INSERT
WITH CHECK (company_id IN (
  SELECT id FROM public.companies WHERE id = company_id
));

CREATE POLICY "Managers can update teachers"
ON public.teachers FOR UPDATE
USING (company_id IN (
  SELECT id FROM public.companies WHERE id = company_id
));

CREATE POLICY "Admins can delete teachers"
ON public.teachers FOR DELETE
USING (company_id IN (
  SELECT id FROM public.companies WHERE id = company_id
));

-- Add comments
COMMENT ON TABLE public.teachers IS 'Teachers/Faculty members in the education CRM';
COMMENT ON COLUMN public.teachers.qualifications IS 'Educational qualifications of the teacher';
COMMENT ON COLUMN public.teachers.subjects IS 'Subjects the teacher can teach';
COMMENT ON COLUMN public.teachers.experience_years IS 'Years of teaching experience';
COMMENT ON COLUMN public.teachers.specialization IS 'Specialization area of the teacher';
