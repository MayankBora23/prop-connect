-- Add purchased columns to leads table for tracking property purchases
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS property_purchased_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS deal_price TEXT;

-- Add comment for the new columns
COMMENT ON COLUMN public.leads.property_purchased_id IS 'ID of the property that was purchased by this lead';
COMMENT ON COLUMN public.leads.deal_price IS 'The final deal price agreed upon for the property purchase';

-- Update RLS policies to allow viewing these columns for company members
-- The existing policies should already cover this since they allow viewing leads by company_id