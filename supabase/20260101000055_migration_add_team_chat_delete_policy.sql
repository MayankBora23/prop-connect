-- Migration: Add DELETE policy for team chat messages
-- Run this in Supabase SQL Editor to allow users to delete their own messages

-- Create policy: Users can delete their own chat messages in their company and industry
CREATE POLICY "Users can delete their own team chat messages in their company and industry"
ON public.team_chat_messages FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND industry = public.get_user_industry(auth.uid())
  AND sender_id = auth.uid()
);