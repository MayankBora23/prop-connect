-- Fix employee_id constraint for multi-tenant support
-- Drop the global unique constraint and add composite unique constraint on (company_id, employee_id)

-- Drop the existing unique constraint on employee_id
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_employee_id_key;

-- Add new composite unique constraint on (company_id, employee_id)
-- This ensures employee_id is unique only within each company
ALTER TABLE public.employees ADD CONSTRAINT employees_company_employee_id_unique UNIQUE (company_id, employee_id);

-- Update the existing indexes for better performance
DROP INDEX IF EXISTS idx_employees_employee_id;
CREATE INDEX IF NOT EXISTS idx_employees_company_employee_id ON public.employees(company_id, employee_id);

-- Update the generate_employee_id function to work with the new constraint
-- This function should generate employee IDs that are unique within each company
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