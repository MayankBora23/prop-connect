-- Allow any Internal CRM user to manage subscriptions (matches companies table policies)
-- Fixes extend trial appearing to succeed but not updating company_subscriptions

DROP POLICY IF EXISTS "internal_crm users update company subscriptions" ON public.company_subscriptions;
CREATE POLICY "internal_crm users update company subscriptions"
ON public.company_subscriptions FOR UPDATE
USING (public.is_internal_crm_user(auth.uid()))
WITH CHECK (public.is_internal_crm_user(auth.uid()));

DROP POLICY IF EXISTS "internal_crm users insert company subscriptions" ON public.company_subscriptions;
CREATE POLICY "internal_crm users insert company subscriptions"
ON public.company_subscriptions FOR INSERT
WITH CHECK (public.is_internal_crm_user(auth.uid()));

DROP POLICY IF EXISTS "internal_crm users select all company subscriptions" ON public.company_subscriptions;
CREATE POLICY "internal_crm users select all company subscriptions"
ON public.company_subscriptions FOR SELECT
USING (public.is_internal_crm_user(auth.uid()));
