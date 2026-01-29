-- Add industry-specific columns to whatsapp_conversations table
-- These columns support automobile and education AI lead qualification flows

ALTER TABLE public.whatsapp_conversations
ADD COLUMN IF NOT EXISTS vehicle_type TEXT,
ADD COLUMN IF NOT EXISTS brand TEXT,
ADD COLUMN IF NOT EXISTS interest TEXT,
ADD COLUMN IF NOT EXISTS course TEXT,
ADD COLUMN IF NOT EXISTS study_mode TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.whatsapp_conversations.vehicle_type IS 'Captured vehicle type from automobile AI flow (car/bike/used_car/used_bike)';
COMMENT ON COLUMN public.whatsapp_conversations.brand IS 'Captured vehicle brand from automobile AI flow';
COMMENT ON COLUMN public.whatsapp_conversations.interest IS 'Captured interest level from education AI flow (yes/info)';
COMMENT ON COLUMN public.whatsapp_conversations.course IS 'Captured course preference from education AI flow (engineering/medical/commerce/arts)';
COMMENT ON COLUMN public.whatsapp_conversations.study_mode IS 'Captured study mode from education AI flow (full_time/part_time/online)';