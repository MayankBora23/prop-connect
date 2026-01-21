-- Add commission and payment columns to leads table for tracking property purchases
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS buyer_commission_pct DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS seller_commission_pct DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS buyer_paid DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS seller_paid DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS deal_status TEXT DEFAULT 'pending' CHECK (deal_status IN ('pending', 'completed')),
ADD COLUMN IF NOT EXISTS deal_closed_at TIMESTAMP WITH TIME ZONE;

-- Add comments for the new columns
COMMENT ON COLUMN public.leads.buyer_commission_pct IS 'Percentage commission for buyer (e.g., 2.5 for 2.5%)';
COMMENT ON COLUMN public.leads.seller_commission_pct IS 'Percentage commission for seller (e.g., 1.5 for 1.5%)';
COMMENT ON COLUMN public.leads.buyer_paid IS 'Total amount paid by buyer for commission';
COMMENT ON COLUMN public.leads.seller_paid IS 'Total amount paid by seller for commission';
COMMENT ON COLUMN public.leads.deal_status IS 'Status of the deal payment (pending or completed)';
COMMENT ON COLUMN public.leads.deal_closed_at IS 'Timestamp when the deal was first closed (deal_price set)';

-- Update RLS policies to allow viewing and updating these columns for company members
-- The existing policies should already cover this since they allow updating leads by company_id