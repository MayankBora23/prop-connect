-- Add lead_score column to leads table
ALTER TABLE public.leads 
ADD COLUMN lead_score integer DEFAULT NULL,
ADD COLUMN score_reasoning text DEFAULT NULL,
ADD COLUMN scored_at timestamp with time zone DEFAULT NULL;