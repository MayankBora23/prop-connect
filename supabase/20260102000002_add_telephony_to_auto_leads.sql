-- Add telephony fields to auto_leads table
ALTER TABLE public.auto_leads
ADD COLUMN IF NOT EXISTS is_telephony_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_called_at TIMESTAMP WITH TIME ZONE;

-- Add comments for the new columns
COMMENT ON COLUMN public.auto_leads.is_telephony_enabled IS 'Whether telephony is enabled for this auto lead';
COMMENT ON COLUMN public.auto_leads.last_called_at IS 'Timestamp of the last call made to this auto lead';

-- Update RLS policy to allow service_role to update auto_leads (for call logging)
-- Note: auto_leads might not have RLS policies defined yet, but this ensures service_role can update if they exist