-- Add subjects_interest column to whatsapp_conversations
-- Stores the user's free-text subject preferences from the education AI flow step 4
-- Used to match against courses.subjects_covered[]

ALTER TABLE public.whatsapp_conversations
ADD COLUMN IF NOT EXISTS subjects_interest TEXT;

COMMENT ON COLUMN public.whatsapp_conversations.subjects_interest IS
  'Captured subject preferences from education AI flow step 4 (e.g. Python, React, Machine Learning)';
