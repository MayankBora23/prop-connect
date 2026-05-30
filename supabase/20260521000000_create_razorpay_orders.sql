CREATE TABLE IF NOT EXISTS public.razorpay_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  razorpay_order_id text NOT NULL UNIQUE,
  amount_inr numeric NOT NULL,
  amount_paise integer NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'pending',
  razorpay_payment_id text,
  credits_added boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_razorpay_orders_company ON public.razorpay_orders (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_razorpay_orders_order_id ON public.razorpay_orders (razorpay_order_id);

ALTER TABLE public.razorpay_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_select_own_orders" ON public.razorpay_orders
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));
