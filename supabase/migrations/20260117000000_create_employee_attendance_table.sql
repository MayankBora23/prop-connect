-- Create employee attendance table for real estate employee attendance tracking

CREATE TABLE IF NOT EXISTS public.employee_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('present', 'absent', 'half_day', 'leave')) DEFAULT 'absent',
    check_in_time TIME,
    check_out_time TIME,
    work_duration INTERVAL, -- calculated field (check_out_time - check_in_time)
    leave_type VARCHAR(20) CHECK (leave_type IN ('casual', 'sick', 'paid', 'unpaid')),
    remarks TEXT,
    is_manual_override BOOLEAN DEFAULT false, -- flag for admin manual entries
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id)
);

-- Create unique constraint to ensure one attendance record per employee per day
CREATE UNIQUE INDEX idx_employee_attendance_unique ON public.employee_attendance(employee_id, attendance_date);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employee_attendance_employee_id ON public.employee_attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_attendance_date ON public.employee_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_employee_attendance_status ON public.employee_attendance(status);
CREATE INDEX IF NOT EXISTS idx_employee_attendance_company_id ON public.employee_attendance(company_id);

-- Enable RLS (Row Level Security)
ALTER TABLE public.employee_attendance ENABLE ROW LEVEL SECURITY;

-- Create policies for employee_attendance table
CREATE POLICY "Users can view attendance from their company" ON public.employee_attendance
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.profiles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins and managers can insert attendance" ON public.employee_attendance
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles
            WHERE user_id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND company_id = employee_attendance.company_id
            AND role IN ('super_admin', 'admin', 'manager')
        )
    );

CREATE POLICY "Admins and managers can update attendance" ON public.employee_attendance
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.profiles
            WHERE user_id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND company_id = employee_attendance.company_id
            AND role IN ('super_admin', 'admin', 'manager')
        )
    );

CREATE POLICY "Admins can delete attendance" ON public.employee_attendance
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM public.profiles
            WHERE user_id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND company_id = employee_attendance.company_id
            AND role IN ('super_admin', 'admin')
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_employee_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on row changes
CREATE TRIGGER trigger_update_employee_attendance_updated_at
    BEFORE UPDATE ON public.employee_attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_attendance_updated_at();

-- Create function to auto-calculate work duration
CREATE OR REPLACE FUNCTION calculate_work_duration()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate work duration if both check-in and check-out times are provided
    IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
        NEW.work_duration = NEW.check_out_time - NEW.check_in_time;
    ELSE
        NEW.work_duration = NULL;
    END IF;

    -- Auto-determine status based on check-in time
    IF NEW.check_in_time IS NULL AND NEW.status = 'absent' THEN
        -- Keep as absent if no check-in
        NEW.status = 'absent';
    ELSIF NEW.check_in_time IS NOT NULL AND NEW.status = 'absent' THEN
        -- Change to present if there's a check-in
        NEW.status = 'present';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate work duration
CREATE TRIGGER trigger_calculate_work_duration
    BEFORE INSERT OR UPDATE ON public.employee_attendance
    FOR EACH ROW
    EXECUTE FUNCTION calculate_work_duration();