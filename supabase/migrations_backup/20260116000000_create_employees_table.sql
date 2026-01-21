-- Create employees table for real estate employee management

CREATE TABLE IF NOT EXISTS public.employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    employment_type VARCHAR(20) CHECK (employment_type IN ('full-time', 'part-time', 'contract')) DEFAULT 'full-time',
    salary DECIMAL(15,2),
    date_of_joining DATE,
    reporting_manager VARCHAR(255),
    address TEXT,
    aadhaar_number VARCHAR(12),
    pan_number VARCHAR(10),
    bank_account_holder_name VARCHAR(255),
    bank_name VARCHAR(255),
    bank_account_number VARCHAR(50),
    bank_ifsc_code VARCHAR(11),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON public.employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON public.employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email);

-- Enable RLS (Row Level Security)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Create policies for employees table
CREATE POLICY "Users can view employees from their company" ON public.employees
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.profiles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins and managers can insert employees" ON public.employees
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles
            WHERE user_id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND company_id = employees.company_id
            AND role IN ('super_admin', 'admin', 'manager')
        )
    );

CREATE POLICY "Admins and managers can update employees" ON public.employees
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.profiles
            WHERE user_id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND company_id = employees.company_id
            AND role IN ('super_admin', 'admin', 'manager')
        )
    );

CREATE POLICY "Admins and managers can delete employees" ON public.employees
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM public.profiles
            WHERE user_id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND company_id = employees.company_id
            AND role IN ('super_admin', 'admin', 'manager')
        )
    );

-- Create function to auto-generate employee ID
CREATE OR REPLACE FUNCTION generate_employee_id()
RETURNS TRIGGER AS $$
DECLARE
    next_id INTEGER;
    formatted_id VARCHAR(50);
BEGIN
    -- Get the next sequence number for this company
    SELECT COALESCE(MAX(CAST(SUBSTRING(employee_id FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_id
    FROM employees
    WHERE company_id = NEW.company_id;

    -- Format as EMP001, EMP002, etc.
    formatted_id := 'EMP' || LPAD(next_id::TEXT, 3, '0');

    NEW.employee_id := formatted_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate employee ID
CREATE TRIGGER trigger_generate_employee_id
    BEFORE INSERT ON public.employees
    FOR EACH ROW
    WHEN (NEW.employee_id IS NULL)
    EXECUTE FUNCTION generate_employee_id();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_employee_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on row changes
CREATE TRIGGER trigger_update_employee_updated_at
    BEFORE UPDATE ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_updated_at();