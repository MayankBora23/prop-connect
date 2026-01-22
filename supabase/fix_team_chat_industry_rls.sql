-- Fix team chat industry-based RLS policies
-- Run this in Supabase SQL Editor to fix the team chat issue
-- This ensures users can only see and send messages within their industry

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view team chat messages in their company" ON public.team_chat_messages;
DROP POLICY IF EXISTS "Users can send team chat messages in their company" ON public.team_chat_messages;
DROP POLICY IF EXISTS "Users can view team chat messages in their company and industry" ON public.team_chat_messages;
DROP POLICY IF EXISTS "Users can send team chat messages in their company and industry" ON public.team_chat_messages;

-- Drop temporary policies if they exist
DROP POLICY IF EXISTS "temp_allow_view_team_chat" ON public.team_chat_messages;
DROP POLICY IF EXISTS "temp_allow_insert_team_chat" ON public.team_chat_messages;

-- Create correct policy: Users can view chat messages in their company and industry
CREATE POLICY "Users can view team chat messages in their company and industry"
ON public.team_chat_messages FOR SELECT
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND industry = public.get_user_industry(auth.uid())
);

-- Create correct policy: Users can insert chat messages in their company and industry
CREATE POLICY "Users can send team chat messages in their company and industry"
ON public.team_chat_messages FOR INSERT
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid())
  AND industry = public.get_user_industry(auth.uid())
  AND sender_id = auth.uid()
);

-- Ensure the industry column is properly populated for existing messages
-- This updates any messages that might not have the industry set correctly
UPDATE public.team_chat_messages
SET industry = companies.industry::text
FROM public.companies
WHERE team_chat_messages.company_id = companies.id
AND (team_chat_messages.industry IS NULL OR team_chat_messages.industry != companies.industry::text);