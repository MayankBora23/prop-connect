-- Wallets, usage tracking, and WhatsApp service pricing (Twilio + Meta)

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  balance numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'INR',
  min_balance_threshold numeric NOT NULL DEFAULT 50,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT wallets_company_id_key UNIQUE (company_id)
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  type text NOT NULL,
  provider text,
  service_type text,
  amount_inr numeric NOT NULL,
  usage_quantity numeric,
  destination_country text,
  message_category text,
  reference_id text,
  twilio_actual_price numeric,
  twilio_price_currency text,
  status text DEFAULT 'completed',
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference_debit
  ON public.wallet_transactions (reference_id)
  WHERE type = 'debit';

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_company_created
  ON public.wallet_transactions (company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  provider text NOT NULL,
  service_type text NOT NULL,
  usage_type text NOT NULL,
  quantity numeric NOT NULL,
  destination_country text,
  message_category text,
  credits_deducted numeric NOT NULL,
  twilio_actual_price numeric,
  reference_id text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_company_created
  ON public.usage_logs (company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.service_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  service_type text NOT NULL,
  destination_country text NOT NULL,
  message_category text,
  client_price_inr numeric NOT NULL,
  your_cost_usd numeric DEFAULT 0,
  unit text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_pricing_lookup
  ON public.service_pricing (provider, service_type, destination_country, message_category, is_active);

-- ---------------------------------------------------------------------------
-- Triggers: wallet on company insert + updated_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_wallet_for_new_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (company_id, balance, currency, min_balance_threshold)
  VALUES (NEW.id, 0, 'INR', 50)
  ON CONFLICT (company_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_company_insert_create_wallet ON public.companies;
CREATE TRIGGER on_company_insert_create_wallet
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE PROCEDURE public.create_wallet_for_new_company();

CREATE OR REPLACE FUNCTION public.set_wallets_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wallets_set_updated_at ON public.wallets;
CREATE TRIGGER trg_wallets_set_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_wallets_updated_at();

CREATE OR REPLACE FUNCTION public.set_service_pricing_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_service_pricing_set_updated_at ON public.service_pricing;
CREATE TRIGGER trg_service_pricing_set_updated_at
  BEFORE UPDATE ON public.service_pricing
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_service_pricing_updated_at();

-- Backfill wallets for existing companies
INSERT INTO public.wallets (company_id, balance, currency, min_balance_threshold)
SELECT c.id, 0, 'INR', 50
FROM public.companies c
LEFT JOIN public.wallets w ON w.company_id = c.id
WHERE w.id IS NULL;

-- Atomic deduct: returns new balance, or NULL if no row updated (insufficient)
CREATE OR REPLACE FUNCTION public.try_deduct_wallet_balance(p_company_id uuid, p_cost numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nb numeric;
BEGIN
  UPDATE public.wallets w
  SET balance = w.balance - p_cost
  WHERE w.company_id = p_company_id
    AND w.balance >= p_cost
    AND w.balance >= w.min_balance_threshold
  RETURNING w.balance INTO nb;
  RETURN nb;
END;
$$;

GRANT EXECUTE ON FUNCTION public.try_deduct_wallet_balance(uuid, numeric) TO service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_pricing ENABLE ROW LEVEL SECURITY;

-- Wallets: company members
CREATE POLICY "wallets_select_company" ON public.wallets
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

-- Balance updates only via service_role (edge functions)

-- wallet_transactions: read for company; service role used by edge functions
CREATE POLICY "wallet_transactions_select_company" ON public.wallet_transactions
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

-- usage_logs: read for company
CREATE POLICY "usage_logs_select_company" ON public.usage_logs
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

-- service_pricing: all authenticated can read
CREATE POLICY "service_pricing_select_auth" ON public.service_pricing
  FOR SELECT TO authenticated
  USING (true);

-- service_pricing: super_admin only write
CREATE POLICY "service_pricing_insert_super" ON public.service_pricing
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "service_pricing_update_super" ON public.service_pricing
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "service_pricing_delete_super" ON public.service_pricing
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- ---------------------------------------------------------------------------
-- Seed service_pricing
-- ---------------------------------------------------------------------------

INSERT INTO public.service_pricing (provider, service_type, destination_country, message_category, client_price_inr, your_cost_usd, unit, is_active)
VALUES
  ('twilio', 'whatsapp', 'IN', 'marketing', 2.13, 0.0157, 'per_conversation', true),
  ('twilio', 'whatsapp', 'IN', 'utility', 1.36, 0.0064, 'per_conversation', true),
  ('twilio', 'whatsapp', 'AE', 'marketing', 9.35, 0.0850, 'per_conversation', true),
  ('twilio', 'whatsapp', 'AE', 'utility', 3.83, 0.0330, 'per_conversation', true),
  ('twilio', 'whatsapp', 'SA', 'marketing', 5.10, 0.0450, 'per_conversation', true),
  ('twilio', 'whatsapp', 'SA', 'utility', 2.13, 0.0150, 'per_conversation', true),
  ('twilio', 'call', 'IN', null, 5.10,  0.0405, 'per_minute', true),
  ('twilio', 'call', 'AE', null, 26.35, 0.2426, 'per_minute', true),
  ('twilio', 'call', 'SA', null, 28.05, 0.2588, 'per_minute', true),
  ('twilio', 'call', 'QA', null, 34.00, 0.3150, 'per_minute', true),
  ('meta', 'whatsapp', 'IN', 'marketing', 0.20, 0, 'per_message', true),
  ('meta', 'whatsapp', 'IN', 'utility', 0.20, 0, 'per_message', true),
  ('meta', 'whatsapp', 'IN', 'authentication', 0.20, 0, 'per_message', true),
  ('meta', 'whatsapp', 'IN', 'service', 0.10, 0, 'per_message', true),
  ('meta', 'whatsapp', 'GCC', 'marketing', 0.85, 0, 'per_message', true),
  ('meta', 'whatsapp', 'GCC', 'utility', 0.85, 0, 'per_message', true),
  ('meta', 'whatsapp', 'GCC', 'authentication', 0.85, 0, 'per_message', true),
  ('meta', 'whatsapp', 'GCC', 'service', 0.42, 0, 'per_message', true);

-- Realtime (balance updates in UI)
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;

ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS call_duration_seconds integer,
  ADD COLUMN IF NOT EXISTS call_duration_minutes integer;

ALTER TABLE usage_logs
  ADD COLUMN IF NOT EXISTS call_duration_seconds integer,
  ADD COLUMN IF NOT EXISTS call_duration_minutes integer;

ALTER TABLE call_logs
  ADD COLUMN IF NOT EXISTS destination_country text,
  ADD COLUMN IF NOT EXISTS blocked_reason text;
