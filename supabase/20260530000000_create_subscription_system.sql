-- Subscription plans, company subscriptions, payment history, trial on registration

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  monthly_price numeric NOT NULL DEFAULT 0,
  quarterly_price numeric NOT NULL DEFAULT 0,
  yearly_price numeric NOT NULL DEFAULT 0,
  included_users integer NOT NULL DEFAULT 3,
  extra_user_price_monthly numeric NOT NULL DEFAULT 0,
  is_custom boolean NOT NULL DEFAULT false,
  features text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO public.subscription_plans
  (name, slug, monthly_price, quarterly_price, yearly_price, included_users, extra_user_price_monthly, is_custom, sort_order, features)
VALUES
  ('Starter', 'starter', 2499, 6999, 24999, 3, 499, false, 1,
   ARRAY['Lead Management','Sales Pipeline','Lead History','Task Management','Follow-up Reminders','Reports & Analytics','WhatsApp Integration','AI Customer Chat','Telephony Integration','Unified Inbox']),
  ('Growth', 'growth', 6999, 18999, 69999, 10, 399, false, 2,
   ARRAY['Everything in Starter','Advanced Reports','Employee Productivity Tracking','Call Analytics','Lead Assignment','Multi-Team Management','Faster AI Response Capacity','Priority CRM Support']),
  ('Pro', 'pro', 14999, 40999, 149999, 25, 299, false, 3,
   ARRAY['Everything in Growth','Multi-Project Management','Analytics','Role & Permission Management','Priority Support','Advanced Team Controls']),
  ('Enterprise', 'enterprise', 0, 0, 0, 999999, 0, true, 4,
   ARRAY['All Pro Features','Unlimited Team Access','White Label CRM','Dedicated Server','Custom Integrations','Dedicated Account Manager','Enterprise-Level Support','Custom AI Workflows'])
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.company_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.subscription_plans(id),
  plan_slug text NOT NULL DEFAULT 'trial',
  billing_cycle text DEFAULT NULL,
  status text NOT NULL DEFAULT 'trial',
  trial_started_at timestamptz NOT NULL DEFAULT now(),
  trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  trial_extended_days integer NOT NULL DEFAULT 0,
  current_period_start timestamptz,
  current_period_end timestamptz,
  next_billing_date timestamptz,
  amount_paid numeric,
  razorpay_order_id text,
  razorpay_payment_id text,
  cancelled_at timestamptz,
  trial_extend_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_subs_company ON public.company_subscriptions (company_id);
CREATE INDEX IF NOT EXISTS idx_company_subs_status ON public.company_subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_company_subs_trial_ends ON public.company_subscriptions (trial_ends_at);

CREATE TABLE IF NOT EXISTS public.subscription_payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_slug text NOT NULL,
  billing_cycle text NOT NULL,
  amount_inr numeric NOT NULL,
  razorpay_order_id text,
  razorpay_payment_id text,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sub_payment_history_company ON public.subscription_payment_history (company_id);
CREATE INDEX IF NOT EXISTS idx_sub_payment_history_order ON public.subscription_payment_history (razorpay_order_id);

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT (now() + interval '7 days');

-- RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payment_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated users select subscription plans" ON public.subscription_plans;
CREATE POLICY "authenticated users select subscription plans"
ON public.subscription_plans FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "users select own company subscription" ON public.company_subscriptions;
CREATE POLICY "users select own company subscription"
ON public.company_subscriptions FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "internal_crm admins select all company subscriptions" ON public.company_subscriptions;
CREATE POLICY "internal_crm admins select all company subscriptions"
ON public.company_subscriptions FOR SELECT
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

DROP POLICY IF EXISTS "internal_crm admins update company subscriptions" ON public.company_subscriptions;
CREATE POLICY "internal_crm admins update company subscriptions"
ON public.company_subscriptions FOR UPDATE
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
)
WITH CHECK (
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

DROP POLICY IF EXISTS "users select own subscription payment history" ON public.subscription_payment_history;
CREATE POLICY "users select own subscription payment history"
ON public.subscription_payment_history FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "internal_crm admins select all subscription payment history" ON public.subscription_payment_history;
CREATE POLICY "internal_crm admins select all subscription payment history"
ON public.subscription_payment_history FOR SELECT
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

-- Auto-create subscription on new company
CREATE OR REPLACE FUNCTION public.handle_new_company_subscription()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.industry::text = 'internal_crm' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.company_subscriptions (company_id, plan_slug, status, trial_started_at, trial_ends_at)
  VALUES (NEW.id, 'trial', 'trial', now(), now() + interval '7 days')
  ON CONFLICT (company_id) DO NOTHING;

  UPDATE public.companies
  SET subscription_status = 'trial',
      trial_ends_at = now() + interval '7 days'
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_new_company_subscription ON public.companies;
CREATE TRIGGER trg_new_company_subscription
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_company_subscription();

CREATE OR REPLACE FUNCTION public.update_company_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_company_subscription_updated_at ON public.company_subscriptions;
CREATE TRIGGER trg_company_subscription_updated_at
  BEFORE UPDATE ON public.company_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_company_subscription_updated_at();

-- Backfill existing companies
INSERT INTO public.company_subscriptions (company_id, plan_slug, status, trial_started_at, trial_ends_at)
SELECT id, 'trial', 'trial', created_at, created_at + interval '7 days'
FROM public.companies
WHERE id NOT IN (SELECT company_id FROM public.company_subscriptions)
AND industry::text != 'internal_crm'
ON CONFLICT (company_id) DO NOTHING;

UPDATE public.companies c
SET subscription_status = 'trial',
    trial_ends_at = cs.trial_ends_at
FROM public.company_subscriptions cs
WHERE c.id = cs.company_id
  AND c.industry::text != 'internal_crm'
  AND (c.subscription_status IS NULL OR c.trial_ends_at IS NULL);
