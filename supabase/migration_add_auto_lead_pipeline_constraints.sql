-- Migration: Add constraints and improvements for automobile leads pipeline
-- This migration adds validation and improvements to support the new automobile sales pipeline

-- Add check constraint for automobile lead status values
ALTER TABLE public.auto_leads
ADD CONSTRAINT auto_leads_status_check
CHECK (status IN (
    'new_lead',
    'contacted',
    'test_drive_scheduled',
    'quotation_shared',
    'negotiation_final_discussion',
    'booking_done',
    'delivered_sold'
));

-- Add index on status for better pipeline performance
CREATE INDEX IF NOT EXISTS idx_auto_leads_status ON public.auto_leads(status);

-- Add index on created_at for better sorting performance
CREATE INDEX IF NOT EXISTS idx_auto_leads_created_at ON public.auto_leads(created_at DESC);

-- Add index on assigned_to for better filtering performance
CREATE INDEX IF NOT EXISTS idx_auto_leads_assigned_to ON public.auto_leads(assigned_to);

-- Add partial index for active leads (not delivered/sold) for faster queries
CREATE INDEX IF NOT EXISTS idx_auto_leads_active ON public.auto_leads(company_id, status)
WHERE status NOT IN ('delivered_sold');

-- Add comments to document the automobile sales pipeline stages
COMMENT ON COLUMN public.auto_leads.status IS 'Automobile sales pipeline stages:
- new_lead: Fresh customer inquiry
- contacted: Initial contact made
- test_drive_scheduled: Customer scheduled for test drive
- quotation_shared: Price quote provided
- negotiation_final_discussion: Price negotiation and final terms
- booking_done: Customer committed and booking confirmed
- delivered_sold: Vehicle delivered to customer';
