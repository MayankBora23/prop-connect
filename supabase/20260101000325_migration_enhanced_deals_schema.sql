-- Enhanced Deals Schema Migration
-- Adds comprehensive deal management with finance, invoices, and payment tracking

-- Add new enums for enhanced deal management
DROP TYPE IF EXISTS public.deal_status CASCADE;
CREATE TYPE public.deal_status AS ENUM ('draft', 'pending', 'approved', 'completed', 'cancelled', 'delivered');

DROP TYPE IF EXISTS public.payment_status CASCADE;
CREATE TYPE public.payment_status AS ENUM ('pending', 'partial', 'completed', 'refunded', 'overdue');

DROP TYPE IF EXISTS public.delivery_status CASCADE;
CREATE TYPE public.delivery_status AS ENUM ('pending', 'ready', 'delivered', 'cancelled');

DROP TYPE IF EXISTS public.finance_type CASCADE;
CREATE TYPE public.finance_type AS ENUM ('none', 'bank_loan', 'finance_company', 'dealer_finance');

DROP TYPE IF EXISTS public.invoice_type CASCADE;
CREATE TYPE public.invoice_type AS ENUM ('customer_invoice', 'finance_invoice', 'delivery_note');

-- Create enhanced deals table (drop and recreate for clean schema)
DROP TABLE IF EXISTS public.deals CASCADE;

CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Deal Information
  lead_id UUID NOT NULL REFERENCES public.auto_leads(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  deal_number TEXT UNIQUE,

  -- Deal Status Tracking
  deal_status deal_status NOT NULL DEFAULT 'draft',
  payment_status payment_status NOT NULL DEFAULT 'pending',
  delivery_status delivery_status NOT NULL DEFAULT 'pending',

  -- Vehicle Details (stored for historical reference)
  vehicle_brand TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  vehicle_variant TEXT,
  vehicle_year INTEGER NOT NULL,
  vehicle_color TEXT,
  chassis_number TEXT,
  engine_number TEXT,
  vehicle_price DECIMAL(12,2) NOT NULL,

  -- Customer Details (auto-fetched from lead)
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  customer_address TEXT,
  customer_city TEXT,
  customer_state TEXT,
  customer_pincode TEXT,

  -- Price Breakdown
  ex_showroom_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  rto_charges DECIMAL(12,2) NOT NULL DEFAULT 0,
  insurance_charges DECIMAL(12,2) NOT NULL DEFAULT 0,
  accessories_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  other_charges DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_on_road_price DECIMAL(12,2) NOT NULL,

  -- Payment Information
  token_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  down_payment DECIMAL(12,2) NOT NULL DEFAULT 0,
  financed_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Finance/Loan Details (conditional fields)
  finance_type finance_type NOT NULL DEFAULT 'none',
  finance_company_name TEXT,
  finance_company_address TEXT,
  loan_amount DECIMAL(12,2),
  loan_tenure_months INTEGER,
  interest_rate DECIMAL(5,2),
  emi_amount DECIMAL(10,2),
  processing_fee DECIMAL(10,2) DEFAULT 0,
  finance_approval_date DATE,
  disbursement_date DATE,
  finance_invoice_number TEXT,

  -- Invoice Information
  customer_invoice_number TEXT,
  customer_invoice_date DATE,
  finance_invoice_date DATE,

  -- GST Information
  cgst_rate DECIMAL(5,2) DEFAULT 0,
  sgst_rate DECIMAL(5,2) DEFAULT 0,
  igst_rate DECIMAL(5,2) DEFAULT 0,
  cgst_amount DECIMAL(10,2) DEFAULT 0,
  sgst_amount DECIMAL(10,2) DEFAULT 0,
  igst_amount DECIMAL(10,2) DEFAULT 0,
  total_gst_amount DECIMAL(10,2) DEFAULT 0,

  -- Delivery Information
  delivery_date DATE,
  delivery_location TEXT,
  delivery_notes TEXT,
  delivery_challan_number TEXT,

  -- Additional Information
  special_conditions TEXT,
  payment_terms TEXT,
  remarks TEXT,

  -- Metadata
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Constraints
  CONSTRAINT chk_finance_details CHECK (
    (finance_type = 'none' AND loan_amount IS NULL AND finance_company_name IS NULL) OR
    (finance_type != 'none' AND loan_amount IS NOT NULL AND finance_company_name IS NOT NULL)
  ),
  CONSTRAINT chk_payment_amounts CHECK (
    (token_amount + down_payment + financed_amount) <= total_on_road_price
  ),
  CONSTRAINT chk_gst_rates CHECK (
    (cgst_rate + sgst_rate + igst_rate) <= 100
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS deals_lead_id_idx ON public.deals USING btree (lead_id);
CREATE INDEX IF NOT EXISTS deals_vehicle_id_idx ON public.deals USING btree (vehicle_id);
CREATE INDEX IF NOT EXISTS deals_booking_id_idx ON public.deals USING btree (booking_id);
CREATE INDEX IF NOT EXISTS deals_deal_status_idx ON public.deals USING btree (deal_status);
CREATE INDEX IF NOT EXISTS deals_payment_status_idx ON public.deals USING btree (payment_status);
CREATE INDEX IF NOT EXISTS deals_delivery_status_idx ON public.deals USING btree (delivery_status);
CREATE INDEX IF NOT EXISTS deals_company_id_idx ON public.deals USING btree (company_id);
CREATE INDEX IF NOT EXISTS deals_created_at_idx ON public.deals USING btree (created_at);
CREATE INDEX IF NOT EXISTS deals_delivery_date_idx ON public.deals USING btree (delivery_date);

-- Enable RLS
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at
CREATE TRIGGER update_deals_updated_at
BEFORE UPDATE ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create invoice tracking table
CREATE TABLE IF NOT EXISTS public.deal_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  invoice_type invoice_type NOT NULL,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  gst_amount DECIMAL(10,2) DEFAULT 0,
  invoice_data JSONB, -- Store complete invoice details
  pdf_url TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  UNIQUE(deal_id, invoice_type)
);

-- Indexes for invoices
CREATE INDEX IF NOT EXISTS deal_invoices_deal_id_idx ON public.deal_invoices USING btree (deal_id);
CREATE INDEX IF NOT EXISTS deal_invoices_invoice_type_idx ON public.deal_invoices USING btree (invoice_type);
CREATE INDEX IF NOT EXISTS deal_invoices_company_id_idx ON public.deal_invoices USING btree (company_id);

-- Enable RLS for invoices
ALTER TABLE public.deal_invoices ENABLE ROW LEVEL SECURITY;

-- Create payment tracking table
CREATE TABLE IF NOT EXISTS public.deal_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  payment_type TEXT NOT NULL, -- 'token', 'down_payment', 'emi', 'full_payment', etc.
  amount DECIMAL(12,2) NOT NULL,
  payment_method TEXT, -- 'cash', 'bank_transfer', 'cheque', 'card', etc.
  reference_number TEXT, -- transaction/cheque number
  remarks TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);

-- Indexes for payments
CREATE INDEX IF NOT EXISTS deal_payments_deal_id_idx ON public.deal_payments USING btree (deal_id);
CREATE INDEX IF NOT EXISTS deal_payments_payment_date_idx ON public.deal_payments USING btree (payment_date);
CREATE INDEX IF NOT EXISTS deal_payments_company_id_idx ON public.deal_payments USING btree (company_id);

-- Enable RLS for payments
ALTER TABLE public.deal_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deals
CREATE POLICY "Users can view deals in their company"
ON public.deals FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create deals in their company"
ON public.deals FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update deals in their company"
ON public.deals FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete deals"
ON public.deals FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role_level(auth.uid(), 'admin')
);

-- RLS Policies for deal_invoices
CREATE POLICY "Users can view deal invoices in their company"
ON public.deal_invoices FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create deal invoices in their company"
ON public.deal_invoices FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update deal invoices in their company"
ON public.deal_invoices FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));

-- RLS Policies for deal_payments
CREATE POLICY "Users can view deal payments in their company"
ON public.deal_payments FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create deal payments in their company"
ON public.deal_payments FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update deal payments in their company"
ON public.deal_payments FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()));