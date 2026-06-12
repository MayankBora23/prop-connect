-- Migration to create whatsapp_templates table for WhatsApp Template Management Module
-- Safe to run multiple times (idempotent)

CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  meta_template_id TEXT,
  category TEXT NOT NULL CHECK (category IN ('MARKETING', 'UTILITY', 'AUTHENTICATION')),
  language TEXT NOT NULL DEFAULT 'en_US',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'paused')),
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  header_type TEXT DEFAULT 'NONE' CHECK (header_type IN ('TEXT', 'IMAGE', 'DOCUMENT', 'VIDEO', 'NONE')),
  header_text TEXT,
  header_media_url TEXT,
  footer_text TEXT,
  buttons JSONB DEFAULT '[]'::jsonb,
  rejection_reason TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Prevent duplicate template names within the same company
  CONSTRAINT unique_company_template_name UNIQUE (company_id, template_name)
);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_whatsapp_templates_updated_at ON public.whatsapp_templates;
CREATE TRIGGER update_whatsapp_templates_updated_at
BEFORE UPDATE ON public.whatsapp_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies

-- 1) View policy: Any employee or admin in the company can view templates
DROP POLICY IF EXISTS "Users can view templates in their company" ON public.whatsapp_templates;
CREATE POLICY "Users can view templates in their company"
ON public.whatsapp_templates FOR SELECT
USING (
  company_id = public.get_user_company_id(auth.uid()) 
  OR auth.role() = 'service_role'
);

-- 2) Write policy: Only managers, admins, and super_admins can create, edit, or delete templates
DROP POLICY IF EXISTS "Admins can manage templates in their company" ON public.whatsapp_templates;
CREATE POLICY "Admins can manage templates in their company"
ON public.whatsapp_templates FOR ALL
USING (
  (company_id = public.get_user_company_id(auth.uid()) AND public.has_role_level(auth.uid(), 'manager'))
  OR auth.role() = 'service_role'
);

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_templates TO service_role;
