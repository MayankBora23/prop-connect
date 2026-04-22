-- Third-party listing portal integrations (real estate only)
-- Idempotent: safe to re-run

-- ---------------------------------------------------------------------------
-- 1) source_configs: per-company toggles + webhook metadata per portal
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.source_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  source_name TEXT NOT NULL CHECK (
    source_name IN (
      '99acres',
      'magicbricks',
      'housing',
      'justdial',
      'squareyards',
      'quikrhomes'
    )
  ),
  method TEXT NOT NULL DEFAULT 'webhook' CHECK (method IN ('webhook', 'api')),
  webhook_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT source_configs_company_source_unique UNIQUE (company_id, source_name)
);

CREATE INDEX IF NOT EXISTS idx_source_configs_company_id
  ON public.source_configs (company_id);

CREATE INDEX IF NOT EXISTS idx_source_configs_active_lookup
  ON public.source_configs (company_id, source_name)
  WHERE is_active = true;

COMMENT ON TABLE public.source_configs IS 'Per-company inbound lead source configuration (property listing portals, etc.)';

ALTER TABLE public.source_configs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2) RLS (mirror whatsapp_settings: company users read; admins manage)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view source configs in their company" ON public.source_configs;
DROP POLICY IF EXISTS "Admins can manage source configs" ON public.source_configs;

CREATE POLICY "Users can view source configs in their company"
  ON public.source_configs
  FOR SELECT
  USING (
    company_id = public.get_user_company_id (auth.uid ())
    OR auth.role () = 'service_role'
  );

CREATE POLICY "Admins can manage source configs"
  ON public.source_configs
  FOR ALL
  USING (
    (
      company_id = public.get_user_company_id (auth.uid ())
      AND public.has_role_level (auth.uid (), 'admin')
    )
    OR auth.role () = 'service_role'
  )
  WITH CHECK (
    (
      company_id = public.get_user_company_id (auth.uid ())
      AND public.has_role_level (auth.uid (), 'admin')
    )
    OR auth.role () = 'service_role'
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.source_configs TO authenticated;
GRANT ALL ON public.source_configs TO service_role;

-- ---------------------------------------------------------------------------
-- 3) Ensure companies always have a webhook_token (for portal URLs)
-- ---------------------------------------------------------------------------
UPDATE public.companies
SET webhook_token = gen_random_uuid ()::text
WHERE webhook_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_webhook_token
  ON public.companies (webhook_token);
