-- Migration: Add reply_to_message_id column to team_chat_messages table
-- Run this in Supabase SQL Editor to add reply functionality to team chat

-- Add reply_to_message_id column to team_chat_messages table
ALTER TABLE public.team_chat_messages
ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES public.team_chat_messages(id) ON DELETE SET NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.team_chat_messages.reply_to_message_id IS 'ID of the message being replied to';