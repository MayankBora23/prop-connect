-- Temporary fix for team chat RLS issue
-- Run this in Supabase SQL Editor to temporarily allow chat messages

-- First, add the industry column if it doesn't exist
ALTER TABLE public.team_chat_messages
ADD COLUMN IF NOT EXISTS industry TEXT;

-- Temporarily disable RLS for INSERT operations to allow messages to be sent
-- This will allow the migration to be tested
ALTER TABLE public.team_chat_messages DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS but with a more permissive policy for now
ALTER TABLE public.team_chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view team chat messages in their company" ON public.team_chat_messages;
DROP POLICY IF EXISTS "Users can send team chat messages in their company" ON public.team_chat_messages;
DROP POLICY IF EXISTS "Users can view team chat messages in their company and industry" ON public.team_chat_messages;
DROP POLICY IF EXISTS "Users can send team chat messages in their company and industry" ON public.team_chat_messages;

-- Create temporary permissive policies
CREATE POLICY "temp_allow_view_team_chat"
ON public.team_chat_messages FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "temp_allow_insert_team_chat"
ON public.team_chat_messages FOR INSERT
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid())
  AND sender_id = auth.uid()
);
