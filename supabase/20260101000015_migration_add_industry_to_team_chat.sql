-- Migration: Add industry column to team_chat_messages table
-- Run this in Supabase SQL Editor

-- Create get_user_industry helper function
CREATE OR REPLACE FUNCTION public.get_user_industry(_user_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.industry::TEXT FROM public.companies c
  JOIN public.profiles p ON p.company_id = c.id
  WHERE p.user_id = _user_id LIMIT 1;
$$;

-- Add industry column to team_chat_messages table
ALTER TABLE public.team_chat_messages
ADD COLUMN IF NOT EXISTS industry TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_team_chat_messages_company_industry_created
ON public.team_chat_messages(company_id, industry, created_at DESC);

-- Update existing records to set industry based on company
-- This will set the industry for existing messages
UPDATE public.team_chat_messages
SET industry = companies.industry
FROM public.companies
WHERE team_chat_messages.company_id = companies.id
AND team_chat_messages.industry IS NULL;

-- Update RLS policies to include industry filtering
DROP POLICY IF EXISTS "Users can view team chat messages in their company" ON public.team_chat_messages;
DROP POLICY IF EXISTS "Users can send team chat messages in their company" ON public.team_chat_messages;

-- Create new policy: Users can view chat messages in their company and industry
CREATE POLICY "Users can view team chat messages in their company and industry"
ON public.team_chat_messages FOR SELECT
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND industry = public.get_user_industry(auth.uid())
);

-- Create policy: Users can insert chat messages in their company and industry
CREATE POLICY "Users can send team chat messages in their company and industry"
ON public.team_chat_messages FOR INSERT
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid())
  AND sender_id = auth.uid()
);
