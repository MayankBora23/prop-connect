export interface Wallet {
  id: string;
  company_id: string;
  balance: number;
  currency: string | null;
  min_balance_threshold: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface WalletTransaction {
  id: string;
  company_id: string;
  type: string;
  provider: string | null;
  service_type: string | null;
  amount_inr: number;
  usage_quantity: number | null;
  destination_country: string | null;
  message_category: string | null;
  reference_id: string | null;
  twilio_actual_price: number | null;
  twilio_price_currency: string | null;
  call_duration_seconds?: number | null;
  call_duration_minutes?: number | null;
  status: string | null;
  notes: string | null;
  created_at: string | null;
}

export interface UsageLog {
  id: string;
  company_id: string;
  provider: string;
  service_type: string;
  usage_type: string;
  quantity: number;
  destination_country: string | null;
  message_category: string | null;
  credits_deducted: number;
  twilio_actual_price: number | null;
  reference_id: string | null;
  call_duration_seconds?: number | null;
  call_duration_minutes?: number | null;
  created_at: string | null;
}

export interface ServicePricing {
  id: string;
  provider: string;
  service_type: string;
  destination_country: string;
  message_category: string | null;
  client_price_inr: number;
  your_cost_usd: number | null;
  unit: string;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}
