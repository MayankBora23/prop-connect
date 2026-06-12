-- Razorpay wallet recharge: payment orders + credit RPC

CREATE TABLE IF NOT EXISTS public.payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  amount_inr numeric NOT NULL CHECK (amount_inr > 0),
  amount_paise integer NOT NULL CHECK (amount_paise > 0),
  currency text NOT NULL DEFAULT 'INR',
  razorpay_order_id text NOT NULL,
  razorpay_payment_id text,
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid', 'failed')),
  receipt text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT payment_orders_razorpay_order_id_key UNIQUE (razorpay_order_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_company_created
  ON public.payment_orders (company_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_transactions_credit_reference
  ON public.wallet_transactions (reference_id)
  WHERE type = 'credit' AND reference_id IS NOT NULL;

-- Atomic credit (service_role only)
CREATE OR REPLACE FUNCTION public.try_add_wallet_balance(p_company_id uuid, p_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nb numeric;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN NULL;
  END IF;

  UPDATE public.wallets w
  SET balance = w.balance + p_amount,
      updated_at = now()
  WHERE w.company_id = p_company_id
  RETURNING w.balance INTO nb;

  RETURN nb;
END;
$$;

GRANT EXECUTE ON FUNCTION public.try_add_wallet_balance(uuid, numeric) TO service_role;

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_orders_select_company" ON public.payment_orders
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_orders;
