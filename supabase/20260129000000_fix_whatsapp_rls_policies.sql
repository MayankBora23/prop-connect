-- Fix WhatsApp RLS Policies for Service Role Access
-- Updates policies to allow webhook service role operations

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view WhatsApp settings in their company" ON public.whatsapp_settings;
DROP POLICY IF EXISTS "Admins can manage WhatsApp settings" ON public.whatsapp_settings;
DROP POLICY IF EXISTS "Users can view WhatsApp conversations in their company" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Users can create WhatsApp conversations in their company" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Users can update WhatsApp conversations in their company" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Users can view WhatsApp messages in their company" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Users can create WhatsApp messages in their company" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Users can update WhatsApp messages in their company" ON public.whatsapp_messages;

-- Recreate policies with service role access
CREATE POLICY "Users can view WhatsApp settings in their company"
ON public.whatsapp_settings FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()) OR auth.role() = 'service_role');

CREATE POLICY "Admins can manage WhatsApp settings"
ON public.whatsapp_settings FOR ALL
USING (
  (company_id = public.get_user_company_id(auth.uid()) AND public.has_role_level(auth.uid(), 'admin'))
  OR auth.role() = 'service_role'
);

CREATE POLICY "Users can view WhatsApp conversations in their company"
ON public.whatsapp_conversations FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()) OR auth.role() = 'service_role');

CREATE POLICY "Users can create WhatsApp conversations in their company"
ON public.whatsapp_conversations FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()) OR auth.role() = 'service_role');

CREATE POLICY "Users can update WhatsApp conversations in their company"
ON public.whatsapp_conversations FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()) OR auth.role() = 'service_role');

CREATE POLICY "Users can view WhatsApp messages in their company"
ON public.whatsapp_messages FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()) OR auth.role() = 'service_role');

CREATE POLICY "Users can create WhatsApp messages in their company"
ON public.whatsapp_messages FOR INSERT
WITH CHECK (company_id = public.get_user_company_id(auth.uid()) OR auth.role() = 'service_role');

CREATE POLICY "Users can update WhatsApp messages in their company"
ON public.whatsapp_messages FOR UPDATE
USING (company_id = public.get_user_company_id(auth.uid()) OR auth.role() = 'service_role');