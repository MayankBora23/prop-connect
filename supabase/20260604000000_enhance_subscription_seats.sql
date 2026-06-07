-- Seat purchases, renewals, and billing metadata for subscriptions

ALTER TABLE public.subscription_payment_history
  ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'plan',
  ADD COLUMN IF NOT EXISTS seat_quantity INTEGER DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscription_payment_history_payment_type_check'
  ) THEN
    ALTER TABLE public.subscription_payment_history
      ADD CONSTRAINT subscription_payment_history_payment_type_check
      CHECK (payment_type IN ('plan', 'seat_purchase', 'renewal'));
  END IF;
END $$;

ALTER TABLE public.company_subscriptions
  ADD COLUMN IF NOT EXISTS purchased_extra_seats INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_seat_rate INTEGER NOT NULL DEFAULT 499,
  ADD COLUMN IF NOT EXISTS plan_included_seats INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS next_billing_amount INTEGER;

-- billing_cycle already exists on company_subscriptions

CREATE TABLE IF NOT EXISTS public.subscription_seat_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subscription_payment_history_id UUID REFERENCES public.subscription_payment_history(id),
  quantity INTEGER NOT NULL,
  prorated_amount INTEGER NOT NULL,
  full_amount INTEGER NOT NULL,
  remaining_days INTEGER NOT NULL,
  cycle_days INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_seat_purchases_company
  ON public.subscription_seat_purchases (company_id);

CREATE INDEX IF NOT EXISTS idx_subscription_seat_purchases_payment
  ON public.subscription_seat_purchases (subscription_payment_history_id);

ALTER TABLE public.subscription_seat_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members can view own seat purchases" ON public.subscription_seat_purchases;
CREATE POLICY "Company members can view own seat purchases"
  ON public.subscription_seat_purchases FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "internal_crm admins select all seat purchases" ON public.subscription_seat_purchases;
CREATE POLICY "internal_crm admins select all seat purchases"
  ON public.subscription_seat_purchases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.companies c ON c.id = p.company_id
      INNER JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.company_id = p.company_id
      WHERE p.user_id = auth.uid()
        AND c.industry::text = 'internal_crm'
        AND ur.role IN ('super_admin'::public.app_role, 'admin'::public.app_role)
    )
  );
