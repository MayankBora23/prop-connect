-- Migration: Create team chat messages table with RLS and realtime
-- Run this in Supabase SQL Editor

-- Create team_chat_messages table
CREATE TABLE IF NOT EXISTS public.team_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.team_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can view chat messages in their company
CREATE POLICY "Users can view team chat messages in their company"
ON public.team_chat_messages FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

-- Create policy: Users can insert chat messages in their company
CREATE POLICY "Users can send team chat messages in their company"
ON public.team_chat_messages FOR INSERT
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid())
  AND sender_id = auth.uid()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_team_chat_messages_company_created
ON public.team_chat_messages(company_id, created_at DESC);

-- Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_chat_messages;
