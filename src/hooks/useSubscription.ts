import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { getCompanyId } from '@/lib/getCompanyId';
import { useCurrentCompany } from '@/hooks/useCompany';

export type BillingCycle = 'monthly' | 'quarterly' | 'yearly';

export type SubscriptionPlan = {
  id: string;
  name: string;
  slug: string;
  monthly_price: number;
  quarterly_price: number;
  yearly_price: number;
  included_users: number;
  extra_user_price_monthly: number;
  is_custom: boolean;
  features: string[];
  sort_order: number;
  is_active: boolean;
};

export type CompanySubscriptionRow = {
  id: string;
  company_id: string;
  plan_id: string | null;
  plan_slug: string;
  billing_cycle: string | null;
  status: string;
  trial_started_at: string;
  trial_ends_at: string;
  trial_extended_days: number;
  trial_extend_notes: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  next_billing_date: string | null;
  amount_paid: number | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  cancelled_at: string | null;
  purchased_extra_seats?: number;
  extra_seat_rate?: number;
  plan_included_seats?: number;
  next_billing_amount?: number | null;
  created_at: string;
  updated_at: string;
};

export type SubscriptionBillingData = {
  planIncludedSeats: number;
  purchasedExtraSeats: number;
  extraSeatRate: number;
  nextBillingAmount: number | null;
  nextBillingDate: Date | null;
  daysUntilBilling: number | null;
  isPaymentOverdue: boolean;
  totalAllowedSeats: number | null;
  currentMemberCount: number;
  availableSeats: number;
  cycleType: BillingCycle | null;
  planBasePrice: number | null;
  planName: string | null;
  status: string;
  planSlug: string;
  isActive: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  isBlocked: boolean;
  currentPeriodEnd: Date | null;
};

export type CompanySubscriptionData = CompanySubscriptionRow & {
  plan_name: string | null;
  included_users: number | null;
  daysLeftInTrial: number;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  isActive: boolean;
  isBlocked: boolean;
  nextBillingDate: Date | null;
  daysUntilBilling: number | null;
  nextBillingAmount: number | null;
  isPaymentOverdue: boolean;
  billingCycle: string | null;
  planBasePrice: number | null;
  purchasedExtraSeats: number;
};

export type AllCompanySubscriptionRow = CompanySubscriptionRow & {
  companies: { name: string; email: string; industry: string } | null;
  subscription_plans: {
    name: string;
    monthly_price: number;
    quarterly_price: number;
    yearly_price: number;
    included_users: number;
  } | null;
};

export type SubscriptionPaymentHistoryRow = {
  id: string
  company_id: string
  plan_slug: string
  billing_cycle: string
  amount_inr: number
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  status: string
  paid_at: string | null
  period_start: string | null
  period_end: string | null
  created_at: string
  payment_type: string | null
  seat_quantity: number | null
}

export function computeSubscriptionFields(
  sub: CompanySubscriptionRow & {
    subscription_plans?: {
      name: string;
      monthly_price: number;
      quarterly_price: number;
      yearly_price: number;
      included_users: number;
    } | null;
  }
): CompanySubscriptionData {
  const now = new Date();
  const trialEndsAt = new Date(sub.trial_ends_at);
  const daysLeftInTrial = Math.max(
    0,
    Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86400000)
  );
  const isTrialActive = sub.status === 'trial' && trialEndsAt > now;
  const isTrialExpired = sub.status === 'trial' && trialEndsAt <= now;
  const isActive = sub.status === 'active';
  const isBlocked =
    (isTrialExpired || sub.status === 'expired' || sub.status === 'cancelled') && !isActive;

  const nextBillingRaw = sub.next_billing_date ?? sub.current_period_end;
  const nextBillingDate = nextBillingRaw ? new Date(nextBillingRaw) : null;

  let daysUntilBilling: number | null = null;
  if (nextBillingRaw) {
    const toISTMidnight = (date: Date) => {
      const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      ist.setHours(0, 0, 0, 0);
      return ist;
    };
    const todayIST = toISTMidnight(new Date());
    const billingIST = toISTMidnight(new Date(nextBillingRaw));
    daysUntilBilling = Math.round(
      (billingIST.getTime() - todayIST.getTime()) / 86400000
    );
  }

  const isPaymentOverdue =
    sub.status === 'active' &&
    daysUntilBilling !== null &&
    daysUntilBilling < 0;

  const cycle = (sub.billing_cycle as BillingCycle | null) ?? (sub.status === 'active' ? 'monthly' : null);
  const planBasePrice =
    sub.subscription_plans && cycle
      ? cycle === 'monthly'
        ? Number(sub.subscription_plans.monthly_price)
        : cycle === 'quarterly'
          ? Number(sub.subscription_plans.quarterly_price)
          : Number(sub.subscription_plans.yearly_price)
      : null;

  const nextBillingAmount =
    sub.next_billing_amount != null ? Number(sub.next_billing_amount) : null;

  return {
    ...sub,
    billing_cycle: sub.billing_cycle ?? (sub.status === 'active' ? 'monthly' : null),
    billingCycle: sub.billing_cycle ?? (sub.status === 'active' ? 'monthly' : null),
    plan_name: sub.subscription_plans?.name ?? null,
    included_users: sub.subscription_plans?.included_users ?? null,
    daysLeftInTrial,
    isTrialActive,
    isTrialExpired,
    isActive,
    isBlocked,
    nextBillingDate,
    daysUntilBilling,
    nextBillingAmount,
    isPaymentOverdue,
    planBasePrice,
    purchasedExtraSeats: Number(sub.purchased_extra_seats ?? 0),
  };
}

export function useSubscription() {
  const { data: company } = useCurrentCompany();
  const companyId = company?.id;

  const query = useQuery({
    queryKey: ['subscription-billing', companyId],
    enabled: !!companyId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<SubscriptionBillingData | null> => {
      const companyId = await getCompanyId();
      if (!companyId) return null;

      const [{ data: sub, error: subErr }, { data: companyRow, error: companyErr }] =
        await Promise.all([
          (supabase as any)
            .from('company_subscriptions')
            .select(
              `
              *,
              subscription_plans (name, monthly_price, quarterly_price, yearly_price, included_users)
            `
            )
            .eq('company_id', companyId)
            .maybeSingle(),
          (supabase as any)
            .from('companies')
            .select('user_limit')
            .eq('id', companyId)
            .maybeSingle(),
        ]);

      if (subErr) throw subErr;
      if (companyErr) throw companyErr;
      if (!sub) return null;

      const { count: memberCount, error: countErr } = await (supabase as any)
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      if (countErr) throw countErr;

      const plan = sub.subscription_plans as {
        name: string;
        monthly_price: number;
        quarterly_price: number;
        yearly_price: number;
        included_users: number;
      } | null;

      const cycle = (sub.billing_cycle as BillingCycle | null) ?? (sub.status === 'active' ? 'monthly' : null);
      const planBasePrice =
        plan && cycle
          ? cycle === 'monthly'
            ? Number(plan.monthly_price)
            : cycle === 'quarterly'
              ? Number(plan.quarterly_price)
              : Number(plan.yearly_price)
          : null;

      const totalAllowedSeats = (companyRow as { user_limit: number | null } | null)?.user_limit ?? null;
      const currentMemberCount = memberCount ?? 0;
      const availableSeats =
        totalAllowedSeats != null ? Math.max(0, totalAllowedSeats - currentMemberCount) : 0;

      const nextBillingRaw = sub.next_billing_date ?? sub.current_period_end;
      const nextBillingDate = nextBillingRaw ? new Date(nextBillingRaw) : null;

      let daysUntilBilling: number | null = null;
      if (nextBillingRaw) {
        const toISTMidnight = (date: Date) => {
          const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
          ist.setHours(0, 0, 0, 0);
          return ist;
        };
        const todayIST = toISTMidnight(new Date());
        const billingIST = toISTMidnight(new Date(nextBillingRaw));
        daysUntilBilling = Math.round(
          (billingIST.getTime() - todayIST.getTime()) / 86400000
        );
      }

      const isPaymentOverdue =
        sub.status === 'active' &&
        daysUntilBilling !== null &&
        daysUntilBilling < 0;

      const now = new Date();
      const trialEndsAt = new Date(sub.trial_ends_at);

      return {
        planIncludedSeats: Number(sub.plan_included_seats ?? plan?.included_users ?? 0),
        purchasedExtraSeats: Number(sub.purchased_extra_seats ?? 0),
        extraSeatRate: Number(sub.extra_seat_rate ?? 499),
        nextBillingAmount:
          sub.next_billing_amount != null ? Number(sub.next_billing_amount) : null,
        nextBillingDate: nextBillingDate,
        daysUntilBilling: daysUntilBilling,
        isPaymentOverdue: isPaymentOverdue,
        totalAllowedSeats,
        currentMemberCount,
        availableSeats,
        cycleType: cycle,
        planBasePrice,
        planName: plan?.name ?? null,
        status: sub.status,
        planSlug: sub.plan_slug,
        isActive: sub.status === 'active',
        isTrialActive: sub.status === 'trial' && trialEndsAt > now,
        isTrialExpired: sub.status === 'trial' && trialEndsAt <= now,
        isBlocked:
          (sub.status === 'trial' && trialEndsAt <= now) ||
          sub.status === 'expired' ||
          sub.status === 'cancelled',
        currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end) : null,
      };
    },
  });

  return {
    ...query,
    refetch: query.refetch,
  };
}

export function useCompanySubscription() {
  const { data: company } = useCurrentCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['company-subscription', companyId],
    enabled: !!companyId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<CompanySubscriptionData | null> => {
      const companyId = await getCompanyId();
      if (!companyId) return null;

      const { data, error } = await (supabase as any)
        .from('company_subscriptions')
        .select(
          `
          *,
          subscription_plans (name, monthly_price, quarterly_price, yearly_price, included_users)
        `
        )
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return computeSubscriptionFields(data as CompanySubscriptionRow & {
        subscription_plans?: {
          name: string;
          monthly_price: number;
          quarterly_price: number;
          yearly_price: number;
          included_users: number;
        } | null;
      });
    },
  });
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ['subscription-plans'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<SubscriptionPlan[]> => {
      const { data, error } = await (supabase as any)
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data ?? []) as SubscriptionPlan[];
    },
  });
}

async function readSubscriptionOrderError(error: unknown): Promise<string | null> {
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

export function useCreateSubscriptionOrder() {
  return useMutation({
    mutationFn: async ({
      plan_slug,
      billing_cycle,
    }: {
      plan_slug: string;
      billing_cycle: BillingCycle;
    }) => {
      const company_id = await getCompanyId();
      if (!company_id) throw new Error('No company found');

      const { data, error } = await supabase.functions.invoke('create-subscription-order', {
        body: { company_id, plan_slug, billing_cycle },
      });

      if (error) {
        const msg = await readSubscriptionOrderError(error);
        throw new Error(msg ?? error.message);
      }

      const raw = (typeof data === 'string' ? JSON.parse(data) : data) as Record<string, unknown>;
      const order_id = String(raw?.order_id ?? '');
      const key_id = String(raw?.key_id ?? '');
      const amount = Number(raw?.amount);
      const currency = String(raw?.currency ?? 'INR');
      const plan_name = String(raw?.plan_name ?? '');
      const price_inr = Number(raw?.price_inr);

      if (!order_id || !key_id || !Number.isFinite(amount) || amount <= 0) {
        throw new Error('Invalid response from payment server');
      }

      return {
        order_id,
        key_id,
        amount,
        currency,
        plan_name,
        billing_cycle,
        price_inr,
      };
    },
  });
}

export function useConfirmSubscriptionPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await new Promise((r) => setTimeout(r, 2500));
      await queryClient.invalidateQueries({ queryKey: ['company-subscription'] });
      await queryClient.invalidateQueries({ queryKey: ['subscription-billing'] });
      await queryClient.invalidateQueries({ queryKey: ['currentCompany'] });
      await queryClient.invalidateQueries({ queryKey: ['subscription-payment-history'] });
    },
  });
}

export function useSubscriptionPaymentHistory(limit = 5) {
  const { data: company } = useCurrentCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['subscription-payment-history', companyId, limit],
    enabled: !!companyId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const companyId = await getCompanyId();
      if (!companyId) return [];

      const { data, error } = await (supabase as any)
        .from('subscription_payment_history')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAllCompanySubscriptions() {
  return useQuery({
    queryKey: ['all-company-subscriptions'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<AllCompanySubscriptionRow[]> => {
      const { data, error } = await (supabase as any)
        .from('company_subscriptions')
        .select(
          `
          *,
          companies (name, email, industry),
          subscription_plans (name, monthly_price, quarterly_price, yearly_price, included_users)
        `
        )
        .order('trial_ends_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as AllCompanySubscriptionRow[];
    },
  });
}

/** Extend from the later of now or current trial end so expired trials actually reopen. */
export function computeExtendedTrialEnd(
  currentTrialEndsAt: string | Date,
  extraDays: number,
  from: Date = new Date()
): Date {
  const currentEnd = new Date(currentTrialEndsAt);
  const base = currentEnd > from ? currentEnd : from;
  return addDays(base, extraDays);
}

export function useExtendTrial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      company_id,
      extra_days,
      notes,
    }: {
      company_id: string;
      extra_days: number;
      notes: string;
    }) => {
      const now = new Date();
      const safeDays = Math.max(1, Math.min(365, extra_days));
      const trimmedNotes = notes.trim();

      const { data: existing, error: fetchErr } = await (supabase as any)
        .from('company_subscriptions')
        .select('trial_ends_at, trial_extended_days, status')
        .eq('company_id', company_id)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      let newTrialEnd: string;
      let newExtendedDays: number;

      const notesPayload = trimmedNotes ? { trial_extend_notes: trimmedNotes } : {};

      if (!existing) {
        newTrialEnd = addDays(now, safeDays).toISOString();
        newExtendedDays = safeDays;

        const { error: insertErr } = await (supabase as any)
          .from('company_subscriptions')
          .insert({
            company_id,
            plan_slug: 'trial',
            status: 'trial',
            trial_started_at: now.toISOString(),
            trial_ends_at: newTrialEnd,
            trial_extended_days: newExtendedDays,
            ...notesPayload,
          });

        if (insertErr) {
          throw new Error(
            insertErr.message.includes('trial_extend_notes')
              ? 'trial_extend_notes column missing. Run migration 20260530000002_add_trial_extend_notes.sql in Supabase.'
              : insertErr.message
          );
        }
      } else {
        const newEnd = computeExtendedTrialEnd(existing.trial_ends_at, safeDays, now);
        newTrialEnd = newEnd.toISOString();
        newExtendedDays = Number(existing.trial_extended_days ?? 0) + safeDays;

        const { data: updated, error: subErr } = await (supabase as any)
          .from('company_subscriptions')
          .update({
            trial_ends_at: newTrialEnd,
            trial_extended_days: newExtendedDays,
            status: 'trial',
            updated_at: now.toISOString(),
            ...notesPayload,
          })
          .eq('company_id', company_id)
          .select('id')
          .maybeSingle();

        if (subErr) {
          throw new Error(
            subErr.message.includes('trial_extend_notes')
              ? 'trial_extend_notes column missing. Run migration 20260530000002_add_trial_extend_notes.sql in Supabase.'
              : subErr.message
          );
        }
        if (!updated) {
          throw new Error(
            'Trial was not updated. Log in as Internal CRM staff and run migration 20260530000001_fix_extend_trial_rls.sql if needed.'
          );
        }
      }

      const { error: companyErr } = await (supabase as any)
        .from('companies')
        .update({ trial_ends_at: newTrialEnd, subscription_status: 'trial' })
        .eq('id', company_id);

      if (companyErr) throw companyErr;

      return { trial_ends_at: newTrialEnd };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-company-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['company-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-billing'] });
      queryClient.invalidateQueries({ queryKey: ['currentCompany'] });
    },
  });
}

export function useCompanyPaymentHistory(companyId: string | null) {
  return useQuery({
    queryKey: ['company-payment-history', companyId],
    enabled: !!companyId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!companyId) return []
      const { data, error } = await (supabase as any)
        .from('subscription_payment_history')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []) as SubscriptionPaymentHistoryRow[]
    },
  })
}
