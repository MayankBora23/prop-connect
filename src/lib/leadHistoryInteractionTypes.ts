import type { Enums } from '@/integrations/supabase/types';

export type InteractionOption = { value: string; label: string };

const BASE: InteractionOption[] = [
  { value: 'call', label: 'Call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'note', label: 'Note' },
  { value: 'email', label: 'Email' },
];

const BY_INDUSTRY: Partial<Record<Enums<'industry_type'>, InteractionOption[]>> = {
  real_estate: [
    { value: 'site_visit', label: 'Site Visit' },
    { value: 'booking_discussion', label: 'Booking Discussion' },
    { value: 'negotiation', label: 'Negotiation' },
    { value: 'broker_meet', label: 'Broker Meet' },
  ],
  automobile_dealers: [
    { value: 'test_drive', label: 'Test Drive' },
    { value: 'price_negotiation', label: 'Price Negotiation' },
    { value: 'finance_discussion', label: 'Finance Discussion' },
    { value: 'delivery_handover', label: 'Delivery / Handover' },
  ],
  education: [
    { value: 'demo_class', label: 'Demo Class' },
    { value: 'fee_discussion', label: 'Fee Discussion' },
    { value: 'parent_meeting', label: 'Parent Meeting' },
    { value: 'counselling', label: 'Counselling' },
  ],
  internal_crm: [
    { value: 'discovery_call', label: 'Discovery Call' },
    { value: 'product_demo', label: 'Product Demo' },
    { value: 'pricing_review', label: 'Pricing Review' },
  ],
};

export function getInteractionOptionsForIndustry(
  industry: Enums<'industry_type'> | null | undefined
): InteractionOption[] {
  const extra = (industry && BY_INDUSTRY[industry]) || [];
  const seen = new Set<string>();
  const merged: InteractionOption[] = [];
  for (const opt of [...extra, ...BASE]) {
    if (seen.has(opt.value)) continue;
    seen.add(opt.value);
    merged.push(opt);
  }
  return merged;
}

export function interactionLabel(value: string, industry: Enums<'industry_type'> | null | undefined): string {
  const list = getInteractionOptionsForIndustry(industry);
  return list.find((o) => o.value === value)?.label ?? value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
