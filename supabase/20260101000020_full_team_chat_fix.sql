-- Complete fix for team chat industry filtering
-- Run this in Supabase SQL Editor after applying temp_fix_chat_rls.sql

-- Create get_user_industry helper function
CREATE OR REPLACE FUNCTION public.get_user_industry(_user_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.industry::TEXT FROM public.companies c
  JOIN public.profiles p ON p.company_id = c.id
  WHERE p.user_id = _user_id LIMIT 1;
$$;

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

-- Make industry column NOT NULL for future records (only if all records have industry set)
-- ALTER TABLE public.team_chat_messages
-- ALTER COLUMN industry SET NOT NULL;

-- Drop temporary policies
DROP POLICY IF EXISTS "temp_allow_view_team_chat" ON public.team_chat_messages;
DROP POLICY IF EXISTS "temp_allow_insert_team_chat" ON public.team_chat_messages;

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
  AND industry = public.get_user_industry(auth.uid())
  AND sender_id = auth.uid()
);
