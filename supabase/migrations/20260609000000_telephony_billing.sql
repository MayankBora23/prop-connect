-- Add order_type to razorpay_orders
ALTER TABLE public.razorpay_orders
  ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'wallet_recharge';

-- New table: company_telephony_subscriptions
CREATE TABLE IF NOT EXISTS public.company_telephony_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  users_count integer NOT NULL DEFAULT 2,
  CONSTRAINT telephony_min_users CHECK (users_count >= 2),
  amount_paid numeric NOT NULL,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_till timestamptz NOT NULL,
  razorpay_order_id text,
  razorpay_payment_id text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.company_telephony_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company members view own telephony sub"
  ON public.company_telephony_subscriptions FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "service role all telephony sub"
  ON public.company_telephony_subscriptions FOR ALL
  USING (true) WITH CHECK (true);

-- Backfill existing telephony subscriptions into wallet_transactions ledger
INSERT INTO public.wallet_transactions (
  company_id,
  type,
  provider,
  service_type,
  amount_inr,
  status,
  notes,
  reference_id,
  created_at
)
SELECT 
  sub.company_id,
  'credit',
  'callerdesk',
  'call',
  sub.amount_paid,
  'completed',
  'CallerDesk Telephony — ' || sub.users_count || ' users',
  sub.razorpay_payment_id,
  sub.created_at
FROM public.company_telephony_subscriptions sub
WHERE sub.razorpay_payment_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.wallet_transactions tx 
    WHERE tx.reference_id = sub.razorpay_payment_id 
      AND tx.provider = 'callerdesk'
  );
