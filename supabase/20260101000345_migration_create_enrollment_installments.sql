-- Create enrollment_installments table for fee management
CREATE TABLE IF NOT EXISTS public.enrollment_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  amount_due DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  due_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.enrollment_installments ENABLE ROW LEVEL SECURITY;

-- Create trigger to update the updated_at column
CREATE TRIGGER update_enrollment_installments_updated_at
BEFORE UPDATE ON public.enrollment_installments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically update fees_paid when installment status changes to 'paid'
CREATE OR REPLACE FUNCTION update_enrollment_fees_paid()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status is being changed to 'paid'
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    -- Increment the fees_paid column in enrollments table
    UPDATE public.enrollments
    SET fees_paid = fees_paid + NEW.amount_due,
        fees_pending = fees_pending - NEW.amount_due
    WHERE id = NEW.enrollment_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function when installment status is updated
CREATE TRIGGER trigger_update_enrollment_fees_paid
AFTER UPDATE ON public.enrollment_installments
FOR EACH ROW EXECUTE FUNCTION update_enrollment_fees_paid();

-- Add comments for documentation
COMMENT ON TABLE public.enrollment_installments IS 'Installment payments for enrollments';
COMMENT ON COLUMN public.enrollment_installments.enrollment_id IS 'Reference to the enrollment this installment belongs to';
COMMENT ON COLUMN public.enrollment_installments.amount_due IS 'Amount due for this installment';
COMMENT ON COLUMN public.enrollment_installments.status IS 'Payment status: pending or paid';
COMMENT ON COLUMN public.enrollment_installments.due_date IS 'Date when this installment is due';

-- Create Row Level Security policies
CREATE POLICY "Users can view enrollment installments for their company" ON public.enrollment_installments
  FOR SELECT USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert enrollment installments for their company" ON public.enrollment_installments
  FOR INSERT WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update enrollment installments for their company" ON public.enrollment_installments
  FOR UPDATE USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete enrollment installments for their company" ON public.enrollment_installments
  FOR DELETE USING (company_id = public.get_user_company_id(auth.uid()));