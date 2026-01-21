-- Migration: Update automobile lead stages to industry-specific pipeline
-- This migration updates existing auto_leads status values to match the new automobile sales pipeline

-- Update status values to match new automobile sales pipeline stages
UPDATE public.auto_leads
SET status = CASE
    WHEN status = 'new' THEN 'new_lead'
    WHEN status = 'qualified' THEN 'test_drive_scheduled'
    WHEN status = 'negotiating' THEN 'negotiation_final_discussion'
    WHEN status = 'closed_won' THEN 'booking_done'
    WHEN status = 'closed_lost' THEN 'delivered_sold'
    ELSE status  -- Keep existing status if it doesn't match the old ones
END
WHERE status IN ('new', 'qualified', 'negotiating', 'closed_won', 'closed_lost');

-- Add comment to document the migration
COMMENT ON TABLE public.auto_leads IS 'Automobile leads table with updated sales pipeline stages: new_lead, contacted, test_drive_scheduled, quotation_shared, negotiation_final_discussion, booking_done, delivered_sold';

-- Optional: Add a check constraint to ensure only valid status values are used
-- Uncomment the following lines if you want to enforce status validation at database level
/*
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
*/
