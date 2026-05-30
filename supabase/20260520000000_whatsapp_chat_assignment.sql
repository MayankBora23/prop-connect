-- WhatsApp chat assignment, human takeover, and agent availability

ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS chat_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS human_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS agent_availability TEXT DEFAULT 'available';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agent_availability TEXT DEFAULT 'available';

CREATE TABLE IF NOT EXISTS public.chat_assignment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  old_assigned_to UUID REFERENCES public.profiles(id),
  new_assigned_to UUID REFERENCES public.profiles(id),
  changed_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_assignment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view chat assignment history in their company"
ON public.chat_assignment_history FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()) OR auth.role() = 'service_role');

CREATE POLICY "Admins and managers can insert chat assignment history"
ON public.chat_assignment_history FOR INSERT
WITH CHECK (
  (company_id = public.get_user_company_id(auth.uid()) AND public.has_role_level(auth.uid(), 'manager'))
  OR auth.role() = 'service_role'
);

CREATE POLICY "Company members can insert own company assignment history"
ON public.chat_assignment_history FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()) OR auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_chat_assignment_history_conversation
  ON public.chat_assignment_history (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_assigned_to
  ON public.whatsapp_conversations (assigned_to);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_chat_status
  ON public.whatsapp_conversations (company_id, chat_status);

GRANT SELECT, INSERT ON public.chat_assignment_history TO authenticated;
