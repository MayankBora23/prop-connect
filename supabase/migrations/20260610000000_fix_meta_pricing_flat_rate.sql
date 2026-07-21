-- Step 1: Remove all old category-based Meta rows
-- Meta handles its own category charges directly from company's Meta account.
-- These rows are no longer used by AiLeadX.
DELETE FROM public.service_pricing
WHERE provider = 'meta' AND service_type = 'whatsapp';

-- Step 2: Insert single flat-rate platform fee row
-- This is AiLeadX's platform fee only — not Meta's charge.
-- To update the rate later, just run:
--   UPDATE public.service_pricing
--   SET client_price_inr = <new_amount>
--   WHERE provider = 'meta' AND message_category = 'platform_fee';
-- No redeployment needed.
INSERT INTO public.service_pricing
  (provider, service_type, destination_country, message_category,
   client_price_inr, your_cost_usd, unit, is_active)
VALUES
  ('meta', 'whatsapp', 'IN', 'platform_fee', 0.20, 0, 'per_message', true);
