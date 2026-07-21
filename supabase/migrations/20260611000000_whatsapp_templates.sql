-- Track 24-hour customer service window per conversation
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS last_customer_message_at timestamptz;

-- Main templates table
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  meta_template_id text,
  category text NOT NULL CHECK (category IN ('MARKETING', 'UTILITY', 'AUTHENTICATION')),
  language text NOT NULL DEFAULT 'en',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'paused')),
  body_text text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  header_type text CHECK (header_type IN ('none', 'text', 'image', 'document', 'video')),
  header_text text,
  header_media_url text,
  footer_text text,
  buttons jsonb DEFAULT '[]'::jsonb,
  rejection_reason text,
  is_library_template boolean DEFAULT false,
  industry text,
  created_by uuid REFERENCES public.profiles(id),
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, template_name)
);

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company members view own templates"
  ON public.whatsapp_templates FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "admins manage templates"
  ON public.whatsapp_templates FOR ALL
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'manager')
    )
  );

CREATE POLICY "service role all"
  ON public.whatsapp_templates FOR ALL
  USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_whatsapp_templates_updated_at ON public.whatsapp_templates;
CREATE TRIGGER update_whatsapp_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at_column();

-- Add action_config column to workflows table
ALTER TABLE public.workflows
  ADD COLUMN IF NOT EXISTS action_config jsonb;
