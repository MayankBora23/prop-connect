import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Wallet, WalletTransaction, UsageLog, ServicePricing } from '@/types/credits';
import {
  startOfMonth,
  endOfMonth,
  subDays,
  format,
  parseISO,
} from 'date-fns';

export type { Wallet, WalletTransaction, UsageLog, ServicePricing };

async function getCompanyId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle();
  return profile?.company_id ?? null;
}

export function useWallet() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['wallet'],
    queryFn: async (): Promise<Wallet | null> => {
      const companyId = await getCompanyId();
      if (!companyId) return null;
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();
      if (error) throw error;
      return data as Wallet | null;
    },
  });

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      const companyId = await getCompanyId();
      if (!companyId) return;

      channel = supabase
        .channel(`wallets_realtime_${companyId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'wallets',
            filter: `company_id=eq.${companyId}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['wallet'] });
          }
        )
        .subscribe();
    };

    setup();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export interface WalletTransactionFilters {
  type?: 'credit' | 'debit';
  provider?: 'twilio' | 'meta';
  service_type?: 'whatsapp' | 'call';
  date_from?: string;
  date_to?: string;
  limit?: number;
}

export function useWalletTransactions(filters?: WalletTransactionFilters) {
  return useQuery({
    queryKey: ['wallet_transactions', filters],
    queryFn: async (): Promise<WalletTransaction[]> => {
      const companyId = await getCompanyId();
      if (!companyId) return [];

      let q = supabase
        .from('wallet_transactions')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (filters?.type) q = q.eq('type', filters.type);
      if (filters?.provider) {
        q = q.eq('provider', filters.provider);
      }
      if (filters?.service_type) {
        q = q.eq('service_type', filters.service_type);
      }
      if (filters?.date_from) {
        q = q.gte('created_at', filters.date_from);
      }
      if (filters?.date_to) {
        q = q.lte('created_at', filters.date_to);
      }
      const lim = filters?.limit ?? 500;
      q = q.limit(lim);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as WalletTransaction[];
    },
  });
}

export interface UsageLogFilters {
  provider?: 'twilio' | 'meta';
  date_from?: string;
  date_to?: string;
  limit?: number;
}

export function useUsageLogs(filters?: UsageLogFilters) {
  return useQuery({
    queryKey: ['usage_logs', filters],
    queryFn: async (): Promise<UsageLog[]> => {
      const companyId = await getCompanyId();
      if (!companyId) return [];

      let q = supabase
        .from('usage_logs')
        .select('*')
        .eq('company_id', companyId)
        .eq('service_type', 'whatsapp')
        .order('created_at', { ascending: false });

      if (filters?.provider) {
        q = q.eq('provider', filters.provider);
      }
      if (filters?.date_from) {
        q = q.gte('created_at', filters.date_from);
      }
      if (filters?.date_to) {
        q = q.lte('created_at', filters.date_to);
      }
      const lim = filters?.limit ?? 500;
      q = q.limit(lim);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as UsageLog[];
    },
  });
}

export function useServicePricing() {
  return useQuery({
    queryKey: ['service_pricing'],
    queryFn: async (): Promise<ServicePricing[]> => {
      const { data, error } = await supabase
        .from('service_pricing')
        .select('*')
        .eq('is_active', true)
        .order('provider', { ascending: true })
        .order('destination_country', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ServicePricing[];
    },
  });
}

export interface CurrentMonthStats {
  total_messages: number;
  twilio_messages: number;
  meta_messages: number;
  call_minutes: number;
  call_count: number;
  call_credits_used: number;
  total_credits_deducted: number;
  by_provider: { twilio: number; meta: number };
}

export function useCurrentMonthStats() {
  return useQuery({
    queryKey: ['usage_logs_month_stats'],
    queryFn: async (): Promise<CurrentMonthStats> => {
      const companyId = await getCompanyId();
      if (!companyId) {
        return {
          total_messages: 0,
          twilio_messages: 0,
          meta_messages: 0,
          call_minutes: 0,
          call_count: 0,
          call_credits_used: 0,
          total_credits_deducted: 0,
          by_provider: { twilio: 0, meta: 0 },
        };
      }

      const start = startOfMonth(new Date()).toISOString();
      const end = endOfMonth(new Date()).toISOString();

      const { data, error } = await supabase
        .from('usage_logs')
        .select('provider, service_type, usage_type, quantity, credits_deducted')
        .eq('company_id', companyId)
        .gte('created_at', start)
        .lte('created_at', end);

      if (error) throw error;

      const rows = (data ?? []) as {
        provider: string;
        service_type: string;
        usage_type: string;
        quantity: number | null;
        credits_deducted: number;
      }[];

      let twilio_messages = 0;
      let meta_messages = 0;
      let total_credits = 0;
      let call_minutes = 0;
      let call_count = 0;
      let call_credits_used = 0;

      for (const row of rows) {
        const qty = Number(row.quantity ?? 0);
        const credits = Number(row.credits_deducted ?? 0);
        total_credits += credits;

        if (row.usage_type === 'call') {
          call_count += 1;
          call_minutes += qty;
          call_credits_used += credits;
          continue;
        }

        // WhatsApp message usage
        if (row.provider === 'twilio') twilio_messages += qty;
        else if (row.provider === 'meta') meta_messages += qty;
      }

      return {
        total_messages: twilio_messages + meta_messages,
        twilio_messages,
        meta_messages,
        call_minutes,
        call_count,
        call_credits_used,
        total_credits_deducted: total_credits,
        by_provider: { twilio: twilio_messages, meta: meta_messages },
      };
    },
  });
}

export function useDailyCreditsLast30Days() {
  return useQuery({
    queryKey: ['usage_logs_daily_30'],
    queryFn: async (): Promise<{ date: string; credits: number }[]> => {
      const companyId = await getCompanyId();
      if (!companyId) return [];

      const from = subDays(new Date(), 30).toISOString();

      const { data, error } = await supabase
        .from('usage_logs')
        .select('created_at, credits_deducted')
        .eq('company_id', companyId)
        .eq('service_type', 'whatsapp')
        .gte('created_at', from)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const map = new Map<string, number>();
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = subDays(today, i);
        map.set(format(d, 'yyyy-MM-dd'), 0);
      }

      for (const row of data ?? []) {
        const day = format(parseISO(row.created_at as string), 'yyyy-MM-dd');
        const prev = map.get(day) ?? 0;
        map.set(day, prev + Number(row.credits_deducted ?? 0));
      }

      return Array.from(map.entries()).map(([date, credits]) => ({ date, credits }));
    },
  });
}

async function readRazorpayOrderError(error: unknown): Promise<string | null> {
  if (!(error instanceof FunctionsHttpError)) return null;
  const ctx = error.context;
  if (!(ctx instanceof Response)) return null;
  try {
    const text = (await ctx.text()).trim();
    if (!text) return null;
    try {
      const parsed = JSON.parse(text) as {
        error?: string;
        detail?: { error?: { description?: string } };
      };
      if (parsed.detail?.error?.description) return parsed.detail.error.description;
      return parsed.error ?? text;
    } catch {
      return text;
    }
  } catch {
    return null;
  }
}

export function useCreateRazorpayOrder() {
  return useMutation({
    mutationFn: async (amount_inr: number) => {
      const companyId = await getCompanyId();
      if (!companyId) throw new Error('No company found');
      const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
        body: { company_id: companyId, amount_inr },
      });
      if (error) {
        const msg = await readRazorpayOrderError(error);
        throw new Error(msg ?? error.message);
      }
      const raw = (typeof data === 'string' ? JSON.parse(data) : data) as Record<string, unknown>;
      const order_id = String(raw?.order_id ?? '');
      const key_id = String(raw?.key_id ?? '');
      const amount = Number(raw?.amount);
      const currency = String(raw?.currency ?? 'INR');
      if (!order_id || !key_id || !Number.isFinite(amount) || amount <= 0) {
        throw new Error('Invalid response from payment server');
      }
      return { order_id, amount, currency, key_id };
    },
  });
}

export function useConfirmRazorpayPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await new Promise((r) => setTimeout(r, 2500));
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
      await queryClient.invalidateQueries({ queryKey: ['wallet_transactions'] });
    },
  });
}
