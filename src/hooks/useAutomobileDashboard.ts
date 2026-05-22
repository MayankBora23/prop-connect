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
import { useCurrentCompany } from './useCompany';
import { useVehicles } from './useVehicles';
import { useAutoLeads, type AutoLead } from './useAutoLeads';
import { useTestDrives } from './useTestDrives';
import { useBookings } from './useBookings';
import { useDeals, type Deal } from './useDeals';
import { useProfiles } from './useProfiles';
import type { BookingWithRelations } from './useAutoTypes';

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

/** Deal is completed when status/delivery/payment reflects a closed sale (not only deal_status). */
function isCompletedDeal(d: Deal): boolean {
  const dealStatus = d.deal_status ?? (d as { status?: string }).status;
  if (dealStatus === 'cancelled' || d.delivery_status === 'cancelled') return false;
  return (
    dealStatus === 'completed' ||
    dealStatus === 'delivered' ||
    dealStatus === 'approved' ||
    d.delivery_status === 'delivered' ||
    (d.payment_status === 'completed' && (d.total_paid ?? 0) > 0)
  );
}

/** Count unique completed sales from deals, delivered leads, and completed bookings. */
function countCompletedSales(
  dealsList: Deal[],
  leadsList: AutoLead[],
  bookingsList: BookingWithRelations[],
  range?: DateRange
): number {
  const seen = new Set<string>();
  const inRangeCheck = (dateStr: string | null | undefined) =>
    !range || inRange(dateStr, range);

  for (const d of dealsList) {
    if (!isCompletedDeal(d)) continue;
    const at = d.updated_at ?? d.created_at;
    if (!inRangeCheck(at)) continue;
    seen.add(d.lead_id ? `lead:${d.lead_id}` : `deal:${d.id}`);
  }

  for (const l of leadsList) {
    if (l.status !== 'delivered_sold') continue;
    const at = l.updated_at ?? l.created_at;
    if (!inRangeCheck(at)) continue;
    seen.add(`lead:${l.id}`);
  }

  for (const b of bookingsList) {
    if (b.status !== 'completed') continue;
    const at = b.updated_at ?? b.created_at;
    if (!inRangeCheck(at)) continue;
    seen.add(b.lead_id ? `lead:${b.lead_id}` : `booking:${b.id}`);
  }

  return seen.size;
}

export function useAutomobileDashboard() {
  const [dateFilter, setDateFilter] = useState<DashboardDateFilter>('month');
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  const range = useMemo(
    () => getDateRange(dateFilter, customRange),
    [dateFilter, customRange]
  );

  const yesterdayRange = useMemo(() => {
    const y = subDays(new Date(), 1);
    return { start: startOfDay(y), end: endOfDay(y) };
  }, []);

  const { data: vehicles = [], isLoading: vehiclesLoading } = useVehicles();
  const { data: leads = [], isLoading: leadsLoading } = useAutoLeads();
  const { data: testDrives = [], isLoading: testDrivesLoading } = useTestDrives();
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings();
  const { data: deals = [], isLoading: dealsLoading } = useDeals();
  const { data: profiles = [] } = useProfiles();

  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['auto-dashboard-activities', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('team_activity_log')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) return [];
      return data ?? [];
    },
    enabled: !!company?.id,
  });

  useEffect(() => {
    if (!company?.id) return;

    const channel = supabase
      .channel(`auto-dashboard-${company.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auto_leads', filter: `company_id=eq.${company.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['auto_leads'] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicles', filter: `company_id=eq.${company.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `company_id=eq.${company.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['bookings'] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'test_drives', filter: `company_id=eq.${company.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['test_drives'] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deals', filter: `company_id=eq.${company.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['deals'] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id, queryClient]);

  const metrics = useMemo(() => {
    const today = new Date().toDateString();
    const dealsList = (deals ?? []) as Deal[];

    const filterLeadsInRange = (l: AutoLead) => inRange(l.created_at, range);
    const filterLeadsYesterday = (l: AutoLead) => inRange(l.created_at, yesterdayRange);

    const leadsInRange = leads.filter(filterLeadsInRange);
    const leadsYesterday = leads.filter(filterLeadsYesterday);

    const newLeadsToday = leads.filter(
      (l) => format(parseISO(l.created_at), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
    ).length;
    const newLeadsYesterday = leads.filter(
      (l) => format(parseISO(l.created_at), 'yyyy-MM-dd') === format(subDays(new Date(), 1), 'yyyy-MM-dd')
    ).length;

    const hotLeads = leads.filter(
      (l) => l.tags?.includes('hot') || l.tags?.includes('Hot')
    ).length;

    const activeBookings = bookings.filter(
      (b) => b.status === 'pending' || b.status === 'confirmed'
    ).length;

    const completedDealsCount = countCompletedSales(dealsList, leads, bookings);
    const completedDealsToday = countCompletedSales(dealsList, leads, bookings, {
      start: startOfDay(new Date()),
      end: endOfDay(new Date()),
    });
    const completedDealsYesterday = countCompletedSales(dealsList, leads, bookings, yesterdayRange);

    const completedDealsInRange = countCompletedSales(dealsList, leads, bookings, range);
    const completedDealsForRevenue = dealsList.filter(isCompletedDeal);

    const totalCollected = dealsList.reduce((s, d) => s + (d.total_paid ?? 0), 0);
    const totalRemaining = dealsList.reduce((s, d) => s + (d.balance_amount ?? 0), 0);
    const totalPayment = dealsList.reduce(
      (s, d) => s + (d.total_on_road_price ?? (d.total_paid ?? 0) + (d.balance_amount ?? 0)),
      0
    );
    const overduePayments = dealsList.filter((d) => d.payment_status === 'overdue').length;
    const emiPending = dealsList.filter(
      (d) => d.finance_type !== 'none' && d.payment_status !== 'completed'
    ).length;

    const pendingDeliveries = dealsList.filter(
      (d) => d.delivery_status === 'pending' || d.delivery_status === 'ready'
    ).length;

    const monthlyRevenue = completedDealsForRevenue
      .filter((d) => inRange(d.updated_at ?? d.created_at, range))
      .reduce((s, d) => s + (d.total_on_road_price ?? 0), 0);

    const todayTestDrives = testDrives.filter(
      (td) => new Date(td.test_drive_date).toDateString() === today
    ).length;
    const yesterdayTestDrives = testDrives.filter((td) =>
      inRange(td.test_drive_date, yesterdayRange)
    ).length;

    const vehiclesToday = vehicles.filter((v) =>
      format(parseISO(v.created_at), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
    ).length;
    const vehiclesYesterday = vehicles.filter((v) => inRange(v.created_at, yesterdayRange)).length;

    return {
      totalVehicles: vehicles.length,
      availableVehicles: vehicles.filter((v) => v.status === 'available').length,
      totalLeads: leads.length,
      newLeads: leads.filter((l) => l.status === 'new_lead').length,
      newLeadsInRange: leadsInRange.length,
      todayTestDrives,
      completedDeals: completedDealsCount,
      totalPayment,
      collectedPayment: totalCollected,
      remainingPayment: totalRemaining,
      pendingDeliveries,
      monthlyRevenue,
      hotLeads,
      activeBookings,
      overduePayments,
      emiPending,
      trends: {
        vehicles: growthPercent(vehiclesToday, vehiclesYesterday),
        leads: growthPercent(newLeadsToday, newLeadsYesterday),
        testDrives: growthPercent(todayTestDrives, yesterdayTestDrives),
        deals: growthPercent(completedDealsToday, completedDealsYesterday),
      },
    };
  }, [vehicles, leads, testDrives, bookings, deals, range, yesterdayRange]);

  const revenueTrend = useMemo(() => {
    const dealsList = (deals ?? []) as Deal[];
    const months = eachMonthOfInterval({
      start: subDays(new Date(), 330),
      end: new Date(),
    }).slice(-12);

    return months.map((m) => {
      const mStart = startOfMonth(m);
      const mEnd = endOfMonth(m);
      const revenue = dealsList
        .filter(
          (d) =>
            isCompletedDeal(d) &&
            isWithinInterval(parseISO(d.updated_at ?? d.created_at), { start: mStart, end: mEnd })
        )
        .reduce((s, d) => s + (d.total_on_road_price ?? 0), 0);
      return { month: format(m, 'MMM'), revenue };
    });
  }, [deals, leads, bookings]);

  const vehicleSalesByMonth = useMemo(() => {
    const dealsList = (deals ?? []) as Deal[];
    const months = eachMonthOfInterval({
      start: subDays(new Date(), 330),
      end: new Date(),
    }).slice(-12);

    return months.map((m) => {
      const mStart = startOfMonth(m);
      const mEnd = endOfMonth(m);
      const sold = countCompletedSales(
        dealsList,
        leads,
        bookings,
        { start: mStart, end: mEnd }
      );
      return { month: format(m, 'MMM'), sold };
    });
  }, [deals, leads, bookings]);

  const paymentCollection = useMemo(() => {
    const dealsList = (deals ?? []) as Deal[];
    const paid = dealsList.filter((d) => d.payment_status === 'completed').length;
    const partial = dealsList.filter((d) => d.payment_status === 'partial').length;
    const pending = dealsList.filter(
      (d) => d.payment_status === 'pending' || d.payment_status === 'overdue'
    ).length;
    return [
      { name: 'Paid', value: paid, color: 'hsl(142, 76%, 36%)' },
      { name: 'Partial', value: partial, color: 'hsl(38, 92%, 50%)' },
      { name: 'Pending', value: pending, color: 'hsl(230, 80%, 55%)' },
    ];
  }, [deals]);

  const leadFunnel = useMemo(() => {
    const stages: { stage: string; statuses: string[]; fill: string }[] = [
      { stage: 'New Lead', statuses: ['new_lead'], fill: 'hsl(230, 80%, 55%)' },
      {
        stage: 'Follow-up',
        statuses: ['contacted', 'quotation_shared', 'negotiation_final_discussion'],
        fill: 'hsl(199, 89%, 48%)',
      },
      { stage: 'Test Drive', statuses: ['test_drive_scheduled'], fill: 'hsl(38, 92%, 50%)' },
      { stage: 'Booking', statuses: ['booking_done'], fill: 'hsl(280, 65%, 60%)' },
      { stage: 'Delivered', statuses: ['delivered_sold'], fill: 'hsl(142, 76%, 36%)' },
    ];
    return stages.map(({ stage, statuses, fill }) => ({
      stage,
      count: leads.filter((l) => statuses.includes(l.status)).length,
      fill,
    }));
  }, [leads]);

  const pipelineStages = useMemo(() => {
    const stages = [
      { id: 'new_lead', label: 'New Lead', color: 'bg-blue-500' },
      { id: 'contacted', label: 'Contacted', color: 'bg-cyan-500' },
      { id: 'quotation_shared', label: 'Interested', color: 'bg-indigo-500' },
      { id: 'test_drive_scheduled', label: 'Test Drive', color: 'bg-orange-500' },
      { id: 'negotiation_final_discussion', label: 'Negotiation', color: 'bg-amber-500' },
      { id: 'booking_done', label: 'Booking', color: 'bg-emerald-500' },
      { id: 'delivered_sold', label: 'Closed', color: 'bg-green-600' },
    ];
    return stages.map((s) => {
      const stageLeads = leads.filter((l) => l.status === s.id);
      const revenue = stageLeads.reduce((sum, l) => {
        const deal = (deals as Deal[] | undefined)?.find((d) => d.lead_id === l.id);
        return sum + (deal?.total_on_road_price ?? l.budget_max ?? 0);
      }, 0);
      return { ...s, count: stageLeads.length, revenue, leads: stageLeads.slice(0, 5) };
    });
  }, [leads, deals]);

  const brandInventory = useMemo(() => {
    const byBrand = vehicles.reduce(
      (acc, v) => {
        acc[v.brand] = (acc[v.brand] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    return Object.entries(byBrand)
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [vehicles]);

  const categoryDistribution = useMemo(() => {
    const byType = vehicles.reduce(
      (acc, v) => {
        const t = v.vehicle_type?.replace('_', ' ') ?? 'other';
        acc[t] = (acc[t] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    return Object.entries(byType).map(([name, value]) => ({ name, value }));
  }, [vehicles]);

  const paymentTable = useMemo(() => {
    return ((deals ?? []) as Deal[])
      .filter((d) => (d.balance_amount ?? 0) > 0 || d.payment_status !== 'completed')
      .slice(0, 8)
      .map((d) => ({
        id: d.id,
        customer: d.customer_name,
        vehicle: `${d.vehicle_brand} ${d.vehicle_model}`,
        total: d.total_on_road_price,
        paid: d.total_paid,
        remaining: d.balance_amount,
        dueDate: d.customer_invoice_date ?? d.delivery_date ?? '—',
        status: d.payment_status,
      }));
  }, [deals]);

  const testDriveStats = useMemo(() => {
    const completed = testDrives.filter((t) => t.status === 'completed').length;
    const cancelled = testDrives.filter((t) => t.status === 'cancelled').length;
    const upcoming = testDrives.filter((t) => t.status === 'scheduled').length;
    const bookingsFromTd = bookings.length;
    return {
      total: testDrives.length,
      completed,
      cancelled,
      upcoming,
      conversion: testDrives.length
        ? Math.round((bookingsFromTd / testDrives.length) * 100)
        : 0,
    };
  }, [testDrives, bookings]);

  const testDriveConversionChart = useMemo(() => {
    return [
      { name: 'Test Drives', value: testDrives.length },
      { name: 'Bookings', value: bookings.length },
    ];
  }, [testDrives, bookings]);

  const employeeLeaderboard = useMemo(() => {
    return profiles
      .map((p) => {
        const userLeads = leads.filter((l) => l.assigned_to === p.user_id);
        const userDeals = ((deals ?? []) as Deal[]).filter((d) => d.created_by === p.user_id);
        const userTestDrives = testDrives.filter((t) => t.created_by === p.user_id);
        const revenue = userDeals.reduce((s, d) => s + (d.total_on_road_price ?? 0), 0);
        return {
          id: p.user_id,
          name: p.name ?? 'Unknown',
          avatar: p.avatar_url,
          leadsHandled: userLeads.length,
          dealsClosed: userDeals.filter(isCompletedDeal).length +
            userLeads.filter((l) => l.status === 'delivered_sold').length,
          revenue,
          testDrives: userTestDrives.length,
          score:
            userLeads.length * 2 +
            userDeals.length * 5 +
            userTestDrives.length * 3 +
            revenue / 100000,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [profiles, leads, deals, testDrives]);

  const inventoryInsights = useMemo(() => {
    const totalValue = vehicles.reduce((s, v) => s + (v.price ?? 0) * (v.quantity ?? 1), 0);
    const thirtyDaysAgo = subDays(new Date(), 30);
    const fastMoving = vehicles.filter((v) => v.status === 'sold').slice(0, 5);
    const unsold = vehicles.filter((v) => v.status === 'available').slice(0, 5);
    const recentlyAdded = [...vehicles]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
    const lowStock = vehicles.filter((v) => (v.quantity ?? 0) <= 1 && v.status === 'available');
    return { totalValue, fastMoving, unsold, recentlyAdded, lowStock };
  }, [vehicles]);

  const recentActivities = useMemo(() => {
    const fromLog = (activities ?? []).map((a: { id: string; action_type: string; description: string; created_at: string }) => ({
      id: a.id,
      type: a.action_type,
      message: a.description,
      time: a.created_at,
    }));

    const fromData = [
      ...leads.slice(0, 3).map((l) => ({
        id: `lead-${l.id}`,
        type: 'lead',
        message: `New lead added: ${l.name}`,
        time: l.created_at,
      })),
      ...bookings.slice(0, 2).map((b) => ({
        id: `booking-${b.id}`,
        type: 'booking',
        message: `Vehicle booked — ${b.booking_number ?? 'Booking'}`,
        time: b.created_at,
      })),
      ...testDrives.slice(0, 2).map((t) => ({
        id: `td-${t.id}`,
        type: 'test_drive',
        message: `Test drive scheduled`,
        time: t.created_at,
      })),
    ];

    return [...fromLog, ...fromData]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 12);
  }, [activities, leads, bookings, testDrives]);

  const isLoading =
    vehiclesLoading || leadsLoading || testDrivesLoading || bookingsLoading || dealsLoading;

  return {
    dateFilter,
    setDateFilter,
    customRange,
    setCustomRange,
    range,
    isLoading,
    activitiesLoading,
    metrics,
    revenueTrend,
    vehicleSalesByMonth,
    paymentCollection,
    leadFunnel,
    pipelineStages,
    brandInventory,
    categoryDistribution,
    paymentTable,
    testDriveStats,
    testDriveConversionChart,
    employeeLeaderboard,
    inventoryInsights,
    recentActivities,
    leads,
    company,
  };
}
