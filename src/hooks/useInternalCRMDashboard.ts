import { useMemo, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  isWithinInterval,
  parseISO,
  eachMonthOfInterval,
} from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAllCompanies, useCurrentCompany } from './useCompany';
import { useInternalLeads, type InternalLeadStage } from './useInternalLeads';
import { useInternalDemos } from './useInternalDemos';
import { useTicketStats } from './useSupport';

const supabaseAny = supabase as any;

export type DashboardDateFilter = 'today' | 'week' | 'month' | 'year' | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
}

function getDateRange(filter: DashboardDateFilter, custom?: DateRange): DateRange {
  const now = new Date();
  switch (filter) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'year':
      return { start: startOfYear(now), end: endOfYear(now) };
    case 'custom':
      return custom ?? { start: startOfMonth(now), end: endOfMonth(now) };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

function inRange(dateStr: string | null | undefined, range: DateRange): boolean {
  if (!dateStr) return false;
  try {
    const d = parseISO(dateStr);
    return isWithinInterval(d, { start: range.start, end: range.end });
  } catch {
    return false;
  }
}

function growthPercent(today: number, yesterday: number): number {
  if (yesterday === 0) return today > 0 ? 100 : 0;
  return Math.round(((today - yesterday) / yesterday) * 100);
}

type PaymentOrder = {
  id: string;
  company_id: string;
  amount_inr: number;
  status: string;
  created_at: string;
  updated_at: string;
};

function isClientCompany(industry: string | undefined): boolean {
  return !!industry && industry !== 'internal_crm';
}

export function useInternalCRMDashboard() {
  const [dateFilter, setDateFilter] = useState<DashboardDateFilter>('month');
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();
  const { data: allCompanies = [], isLoading: companiesLoading } = useAllCompanies();
  const { data: leads = [], isLoading: leadsLoading } = useInternalLeads();
  const { data: demos = [], isLoading: demosLoading } = useInternalDemos();
  const { data: ticketStats, isLoading: ticketsLoading } = useTicketStats();

  const range = useMemo(
    () => getDateRange(dateFilter, customRange),
    [dateFilter, customRange]
  );

  const yesterdayRange = useMemo(() => {
    const y = subDays(new Date(), 1);
    return { start: startOfDay(y), end: endOfDay(y) };
  }, []);

  const clientCompanies = useMemo(
    () => allCompanies.filter((c) => isClientCompany(c.industry)),
    [allCompanies]
  );

  const { data: paymentOrders = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['internal-crm-payment-orders'],
    queryFn: async () => {
      const { data, error } = await supabaseAny
        .from('payment_orders')
        .select('id, company_id, amount_inr, status, created_at, updated_at')
        .eq('status', 'paid')
        .order('created_at', { ascending: false });
      if (error) return [];
      return (data ?? []) as PaymentOrder[];
    },
  });

  useEffect(() => {
    if (!company?.id) return;

    const channel = supabase
      .channel(`internal-crm-dashboard-${company.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'internal_leads' },
        () => queryClient.invalidateQueries({ queryKey: ['internalLeads'] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'internal_crm_demos' },
        () => queryClient.invalidateQueries({ queryKey: ['internal_demos'] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'companies' },
        () => queryClient.invalidateQueries({ queryKey: ['allCompanies'] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id, queryClient]);

  const metrics = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    const companiesToday = clientCompanies.filter(
      (c) => format(parseISO(c.created_at), 'yyyy-MM-dd') === todayStr
    ).length;
    const companiesYesterday = clientCompanies.filter((c) =>
      inRange(c.created_at, yesterdayRange)
    ).length;

    const leadsToday = leads.filter(
      (l) => format(parseISO(l.created_at), 'yyyy-MM-dd') === todayStr
    ).length;
    const leadsYesterday = leads.filter((l) => inRange(l.created_at, yesterdayRange)).length;

    const todayDemos = demos.filter((d) => d.demo_date === todayStr).length;
    const yesterdayDemos = demos.filter((d) => inRange(d.demo_date, yesterdayRange)).length;

    const paidInRange = paymentOrders.filter((p) => inRange(p.updated_at ?? p.created_at, range));
    const rechargeRevenue = paidInRange.reduce((s, p) => s + Number(p.amount_inr ?? 0), 0);

    const activeClients = clientCompanies.filter(
      (c) => (c.account_status ?? 'active') === 'active'
    ).length;
    const suspendedClients = clientCompanies.filter(
      (c) => c.account_status === 'suspended'
    ).length;
    const premiumClients = clientCompanies.filter((c) => c.plan_type === 'premium').length;
    const trialClients = clientCompanies.filter((c) => c.plan_type === 'trial').length;

    return {
      totalClients: clientCompanies.length,
      activeClients,
      suspendedClients,
      premiumClients,
      trialClients,
      realEstateClients: clientCompanies.filter((c) => c.industry === 'real_estate').length,
      educationClients: clientCompanies.filter((c) => c.industry === 'education').length,
      automobileClients: clientCompanies.filter((c) => c.industry === 'automobile_dealers').length,
      totalLeads: leads.length,
      newLeads: leads.filter((l) => l.stage === 'new').length,
      pipelineLeads: leads.filter((l) =>
        ['contacted', 'demo_scheduled', 'trial_started'].includes(l.stage)
      ).length,
      closedWon: leads.filter((l) => l.stage === 'closed_won').length,
      closedLost: leads.filter((l) => l.stage === 'closed_lost').length,
      todayDemos,
      openTickets: ticketStats?.open ?? 0,
      inProgressTickets: ticketStats?.in_progress ?? 0,
      unreadTickets: ticketStats?.unread_by_admin ?? 0,
      rechargeRevenue,
      newClientsInRange: clientCompanies.filter((c) => inRange(c.created_at, range)).length,
      newLeadsInRange: leads.filter((l) => inRange(l.created_at, range)).length,
      trends: {
        companies: growthPercent(companiesToday, companiesYesterday),
        leads: growthPercent(leadsToday, leadsYesterday),
        demos: growthPercent(todayDemos, yesterdayDemos),
      },
    };
  }, [
    clientCompanies,
    leads,
    demos,
    paymentOrders,
    ticketStats,
    range,
    yesterdayRange,
  ]);

  const revenueTrend = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subDays(new Date(), 330),
      end: new Date(),
    }).slice(-12);

    return months.map((m) => {
      const mStart = startOfMonth(m);
      const mEnd = endOfMonth(m);
      const revenue = paymentOrders
        .filter((p) =>
          isWithinInterval(parseISO(p.updated_at ?? p.created_at), { start: mStart, end: mEnd })
        )
        .reduce((s, p) => s + Number(p.amount_inr ?? 0), 0);
      return { month: format(m, 'MMM'), revenue };
    });
  }, [paymentOrders]);

  const signupsByMonth = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subDays(new Date(), 330),
      end: new Date(),
    }).slice(-12);

    return months.map((m) => {
      const mStart = startOfMonth(m);
      const mEnd = endOfMonth(m);
      const signups = clientCompanies.filter((c) =>
        isWithinInterval(parseISO(c.created_at), { start: mStart, end: mEnd })
      ).length;
      return { month: format(m, 'MMM'), signups };
    });
  }, [clientCompanies]);

  const planDistribution = useMemo(() => {
    const premium = clientCompanies.filter((c) => c.plan_type === 'premium').length;
    const trial = clientCompanies.filter((c) => c.plan_type === 'trial').length;
    const bypass = clientCompanies.filter((c) => c.plan_type === 'bypass').length;
    const other = clientCompanies.length - premium - trial - bypass;
    return [
      { name: 'Premium', value: premium, color: 'hsl(142, 76%, 36%)' },
      { name: 'Trial', value: trial, color: 'hsl(38, 92%, 50%)' },
      { name: 'Bypass', value: bypass, color: 'hsl(199, 89%, 48%)' },
      { name: 'Other', value: other, color: 'hsl(230, 80%, 55%)' },
    ].filter((p) => p.value > 0);
  }, [clientCompanies]);

  const leadFunnel = useMemo(() => {
    const stages: { stage: string; keys: InternalLeadStage[]; fill: string }[] = [
      { stage: 'New', keys: ['new'], fill: 'hsl(230, 80%, 55%)' },
      { stage: 'Contacted', keys: ['contacted'], fill: 'hsl(199, 89%, 48%)' },
      { stage: 'Demo Scheduled', keys: ['demo_scheduled'], fill: 'hsl(38, 92%, 50%)' },
      { stage: 'Trial Started', keys: ['trial_started'], fill: 'hsl(280, 65%, 60%)' },
      { stage: 'Closed Won', keys: ['closed_won'], fill: 'hsl(142, 76%, 36%)' },
      { stage: 'Closed Lost', keys: ['closed_lost'], fill: 'hsl(0, 72%, 51%)' },
    ];
    return stages.map(({ stage, keys, fill }) => ({
      stage,
      count: leads.filter((l) => keys.includes(l.stage)).length,
      fill,
    }));
  }, [leads]);

  const industryDistribution = useMemo(() => {
    const counts = clientCompanies.reduce(
      (acc, c) => {
        const key =
          c.industry === 'real_estate'
            ? 'Real Estate'
            : c.industry === 'education'
              ? 'Education'
              : c.industry === 'automobile_dealers'
                ? 'Automobile'
                : 'Other';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [clientCompanies]);

  const demoConversionChart = useMemo(() => {
    return [
      { name: 'Demos', value: demos.length },
      { name: 'Closed Won', value: leads.filter((l) => l.stage === 'closed_won').length },
    ];
  }, [demos, leads]);

  const demoStats = useMemo(() => {
    const completed = demos.filter((d) => d.status === 'completed').length;
    const cancelled = demos.filter((d) => d.status === 'cancelled').length;
    const upcoming = demos.filter((d) => d.status === 'scheduled').length;
    const won = leads.filter((l) => l.stage === 'closed_won').length;
    return {
      total: demos.length,
      completed,
      cancelled,
      upcoming,
      conversion: demos.length ? Math.round((won / demos.length) * 100) : 0,
    };
  }, [demos, leads]);

  const platformInsights = useMemo(() => {
    const recentClients = [...clientCompanies]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
    const suspended = clientCompanies.filter((c) => c.account_status === 'suspended');
    const expiringTrials = clientCompanies.filter((c) => {
      if (c.plan_type !== 'trial' || !c.trial_ends_at) return false;
      const days = Math.ceil(
        (parseISO(c.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return days >= 0 && days <= 7;
    });
    return { recentClients, suspended, expiringTrials };
  }, [clientCompanies]);

  const recentLeads = useMemo(
    () =>
      [...leads]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 8),
    [leads]
  );

  const isLoading =
    companiesLoading || leadsLoading || demosLoading || ticketsLoading || paymentsLoading;

  return {
    dateFilter,
    setDateFilter,
    customRange,
    setCustomRange,
    range,
    isLoading,
    metrics,
    revenueTrend,
    signupsByMonth,
    planDistribution,
    leadFunnel,
    industryDistribution,
    demoConversionChart,
    demoStats,
    platformInsights,
    recentLeads,
    company,
    leads,
  };
}
