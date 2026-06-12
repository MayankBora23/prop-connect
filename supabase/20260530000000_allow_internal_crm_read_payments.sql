-- Migration: Allow internal CRM users to view wallet transactions and payment orders across all companies
-- This enables auditing payment history globally in the Internal CRM.

DROP POLICY IF EXISTS "wallet_transactions_select_internal_crm" ON public.wallet_transactions;
CREATE POLICY "wallet_transactions_select_internal_crm" ON public.wallet_transactions
  FOR SELECT TO authenticated
  USING (public.is_internal_crm_user(auth.uid()));

DROP POLICY IF EXISTS "payment_orders_select_internal_crm" ON public.payment_orders;
CREATE POLICY "payment_orders_select_internal_crm" ON public.payment_orders
  FOR SELECT TO authenticated
  USING (public.is_internal_crm_user(auth.uid()));
