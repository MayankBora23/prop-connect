import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  eachDayOfInterval,
} from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from './useCompany';
import type { TelephonyProviderKey } from './useTelephony';

export type { TelephonyProviderKey };

export type CallLogRow = {
  id: string;
  company_id: string;
  agent_id: string | null;
  lead_id: string | null;
  direction: string;
  status: string;
  duration: number | null;
  recording_url: string | null;
  provider: string | null;
  customer_number: string | null;
  agent_number: string | null;
  twilio_from_number: string | null;
  twilio_to_number: string | null;
  callerdesk_customer_number: string | null;
  callerdesk_source_number: string | null;
  callerdesk_call_sid: string | null;
  callerdesk_bridge_number: string | null;
  twilio_call_sid: string | null;
  created_at: string;
};

export function isCallerDeskCallLog(log: CallLogRow): boolean {
  if (log.provider === 'callerdesk') return true;
  if (log.provider === 'twilio') return false;
  return Boolean(log.callerdesk_call_sid || log.callerdesk_customer_number || log.callerdesk_source_number);
}

export function filterLogsByTelephonyProvider(
  logs: CallLogRow[],
  provider: TelephonyProviderKey
): CallLogRow[] {
  return logs.filter((log) =>
    provider === 'callerdesk' ? isCallerDeskCallLog(log) : !isCallerDeskCallLog(log)
  );
}

export type CallAnalyticsDay = {
  date: string;
  total: number;
  answered: number;
  unanswered: number;
};

export type AgentPerformanceRow = {
  agent_id: string;
  name: string;
  /** CallerDesk bridge number or Twilio agent_identity */
  endpoint: string;
  total_calls: number;
  answered_calls: number;
  missed_calls: number;
  avg_duration_seconds: number;
};

export type CallAnalyticsData = {
  telephony_provider: string;
  total_calls: number;
  answered_calls: number;
  unanswered_calls: number;
  missed_calls: number;
  failed_calls: number;
  total_duration_seconds: number;
  total_duration_formatted: string;
  recordings_available: number;
  answered_percentage: number;
  unanswered_percentage: number;
  today_total: number;
  yesterday_total: number;
  last_7_days: CallAnalyticsDay[];
  last_7_days_answered_percentage: number;
  last_7_days_unanswered_percentage: number;
  last_7_days_total: number;
  this_month_answered_percentage: number;
  this_month_missed_percentage: number;
  this_month_total: number;
  last_month_total: number;
  agent_performance: AgentPerformanceRow[];
  profiles_by_user_id: Record<string, string>;
  profiles_meta: Record<string, ProfileTelephonyMeta>;
};

async function getUserCompanyId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).maybeSingle();
  return data?.company_id || null;
}

type UserContext = {
  userId: string;
  companyId: string;
  role: AppRole;
};

async function getUserContext(): Promise<UserContext | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile?.company_id) return null;

  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('company_id', profile.company_id)
    .maybeSingle();

  return {
    userId: user.id,
    companyId: profile.company_id,
    role: (roleRow?.role as AppRole) || 'sales',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const callLogsTable = () => (supabase as any).from('call_logs');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyRoleFilter(query: any, role: AppRole, userId: string) {
  if (role === 'sales') {
    return query.eq('agent_id', userId);
  }
  return query;
}

/** Restrict rows to the active telephony provider (Company Settings dropdown). */
function applyProviderFilter(query: any, provider: TelephonyProviderKey) {
  if (provider === 'callerdesk') {
    return query.or(
      'provider.eq.callerdesk,callerdesk_call_sid.not.is.null,callerdesk_customer_number.not.is.null'
    );
  }
  return query.or(
    'provider.eq.twilio,and(callerdesk_call_sid.is.null,callerdesk_customer_number.is.null),twilio_call_sid.not.is.null'
  );
}

async function fetchCallLogsInRange(
  companyId: string,
  from: string,
  to: string,
  role: AppRole,
  userId: string,
  provider: TelephonyProviderKey
): Promise<CallLogRow[]> {
  let query = callLogsTable()
    .select('*')
    .eq('company_id', companyId)
    .gte('created_at', from)
    .lte('created_at', to)
    .order('created_at', { ascending: false });

  query = applyRoleFilter(query, role, userId);
  query = applyProviderFilter(query, provider);

  const { data, error } = await query;
  if (error) throw error;
  return filterLogsByTelephonyProvider((data || []) as CallLogRow[], provider);
}

export function getCallDateRange(
  filter: string,
  customFrom?: Date,
  customTo?: Date
): { from: string; to: string } {
  const now = new Date();

  switch (filter) {
    case 'today':
      return {
        from: startOfDay(now).toISOString(),
        to: now.toISOString(),
      };
    case 'yesterday': {
      const y = subDays(now, 1);
      return {
        from: startOfDay(y).toISOString(),
        to: endOfDay(y).toISOString(),
      };
    }
    case 'last7days':
      return {
        from: startOfDay(subDays(now, 6)).toISOString(),
        to: now.toISOString(),
      };
    case 'thismonth':
      return {
        from: startOfMonth(now).toISOString(),
        to: now.toISOString(),
      };
    case 'lastmonth': {
      const prev = subMonths(now, 1);
      return {
        from: startOfMonth(prev).toISOString(),
        to: endOfMonth(prev).toISOString(),
      };
    }
    case 'custom':
      return {
        from: customFrom ? startOfDay(customFrom).toISOString() : startOfMonth(now).toISOString(),
        to: customTo ? endOfDay(customTo).toISOString() : now.toISOString(),
      };
    default:
      return {
        from: startOfMonth(now).toISOString(),
        to: now.toISOString(),
      };
  }
}

function isAnswered(status: string) {
  return status === 'completed' || status === 'connected';
}

function formatTotalDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs} hr ${mins} min`;
  return `${mins} min`;
}

function pct(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function computeMetrics(logs: CallLogRow[]) {
  const total_calls = logs.length;
  const answered_calls = logs.filter((l) => isAnswered(l.status)).length;
  const unanswered_calls = logs.filter((l) => l.status === 'no_answer').length;
  const missed_calls = logs.filter((l) => l.status === 'no_answer' && l.direction === 'incoming').length;
  const failed_calls = logs.filter((l) => l.status === 'busy' || l.status === 'failed').length;
  const total_duration_seconds = logs.reduce((sum, l) => sum + (l.duration || 0), 0);
  const recordings_available = logs.filter((l) => l.recording_url).length;

  return {
    total_calls,
    answered_calls,
    unanswered_calls,
    missed_calls,
    failed_calls,
    total_duration_seconds,
    total_duration_formatted: formatTotalDuration(total_duration_seconds),
    recordings_available,
    answered_percentage: pct(answered_calls, total_calls),
    unanswered_percentage: pct(unanswered_calls, total_calls),
  };
}

function buildLast7DaysSeries(logs: CallLogRow[]): CallAnalyticsDay[] {
  const now = new Date();
  const days = eachDayOfInterval({
    start: startOfDay(subDays(now, 6)),
    end: startOfDay(now),
  });

  return days.map((day) => {
    const key = format(day, 'yyyy-MM-dd');
    const dayLogs = logs.filter((l) => format(new Date(l.created_at), 'yyyy-MM-dd') === key);
    return {
      date: key,
      total: dayLogs.length,
      answered: dayLogs.filter((l) => isAnswered(l.status)).length,
      unanswered: dayLogs.filter((l) => l.status === 'no_answer').length,
    };
  });
}

function bridgeKeyForLog(log: CallLogRow): string {
  return log.agent_number || log.callerdesk_bridge_number || 'unknown-bridge';
}

function buildAgentPerformance(
  logs: CallLogRow[],
  profilesByUserId: Record<string, string>,
  provider: TelephonyProviderKey,
  profilesMeta: Record<string, ProfileTelephonyMeta>
): AgentPerformanceRow[] {
  const byKey = new Map<string, CallLogRow[]>();

  for (const log of logs) {
    const key =
      provider === 'callerdesk'
        ? bridgeKeyForLog(log)
        : log.agent_id || 'unassigned';
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(log);
  }

  const rows: AgentPerformanceRow[] = [];

  for (const [key, agentLogs] of byKey) {
    if (key === 'unassigned' || key === 'unknown-bridge') continue;

    const answered = agentLogs.filter((l) => isAnswered(l.status)).length;
    const missed = agentLogs.filter((l) => l.status === 'no_answer' && l.direction === 'incoming').length;
    const totalDuration = agentLogs.reduce((s, l) => s + (l.duration || 0), 0);

    if (provider === 'callerdesk') {
      const crmUsers = [
        ...new Set(
          agentLogs
            .map((l) => l.agent_id)
            .filter((id): id is string => !!id)
            .map((id) => profilesByUserId[id])
            .filter(Boolean)
        ),
      ];
      rows.push({
        agent_id: key,
        name: crmUsers.length > 0 ? crmUsers.join(', ') : '—',
        endpoint: key,
        total_calls: agentLogs.length,
        answered_calls: answered,
        missed_calls: missed,
        avg_duration_seconds: agentLogs.length > 0 ? Math.round(totalDuration / agentLogs.length) : 0,
      });
    } else {
      const meta = profilesMeta[key];
      rows.push({
        agent_id: key,
        name: profilesByUserId[key] || meta?.name || 'Unknown Agent',
        endpoint: meta?.agent_identity || agentLogs[0]?.agent_number || '—',
        total_calls: agentLogs.length,
        answered_calls: answered,
        missed_calls: missed,
        avg_duration_seconds: agentLogs.length > 0 ? Math.round(totalDuration / agentLogs.length) : 0,
      });
    }
  }

  return rows.sort((a, b) => b.total_calls - a.total_calls);
}

export function useCallAnalytics(
  filter: string,
  provider: TelephonyProviderKey,
  customFrom?: Date,
  customTo?: Date
) {
  return useQuery({
    queryKey: ['call-analytics', provider, filter, customFrom?.toISOString(), customTo?.toISOString()],
    queryFn: async (): Promise<CallAnalyticsData> => {
      const ctx = await getUserContext();
      if (!ctx) {
        throw new Error('No company found');
      }

      const { from, to } = getCallDateRange(filter, customFrom, customTo);
      const todayRange = getCallDateRange('today');
      const yesterdayRange = getCallDateRange('yesterday');
      const last7Range = getCallDateRange('last7days');
      const thisMonthRange = getCallDateRange('thismonth');
      const lastMonthRange = getCallDateRange('lastmonth');

      const [
        mainLogs,
        todayLogs,
        yesterdayLogs,
        last7Logs,
        thisMonthLogs,
        lastMonthLogs,
        profilesRes,
      ] = await Promise.all([
        fetchCallLogsInRange(ctx.companyId, from, to, ctx.role, ctx.userId, provider),
        fetchCallLogsInRange(ctx.companyId, todayRange.from, todayRange.to, ctx.role, ctx.userId, provider),
        fetchCallLogsInRange(ctx.companyId, yesterdayRange.from, yesterdayRange.to, ctx.role, ctx.userId, provider),
        fetchCallLogsInRange(ctx.companyId, last7Range.from, last7Range.to, ctx.role, ctx.userId, provider),
        fetchCallLogsInRange(ctx.companyId, thisMonthRange.from, thisMonthRange.to, ctx.role, ctx.userId, provider),
        fetchCallLogsInRange(ctx.companyId, lastMonthRange.from, lastMonthRange.to, ctx.role, ctx.userId, provider),
        supabase.from('profiles').select('user_id, name, agent_identity').eq('company_id', ctx.companyId),
      ]);

      if (profilesRes.error) throw profilesRes.error;

      const profiles_by_user_id: Record<string, string> = {};
      const profiles_meta: Record<string, ProfileTelephonyMeta> = {};
      for (const p of profilesRes.data || []) {
        if (p.user_id) {
          profiles_by_user_id[p.user_id] = p.name || 'Unknown';
          profiles_meta[p.user_id] = {
            name: p.name || 'Unknown',
            agent_identity: p.agent_identity ?? null,
          };
        }
      }

      const metrics = computeMetrics(mainLogs);
      const last7Metrics = computeMetrics(last7Logs);
      const thisMonthMetrics = computeMetrics(thisMonthLogs);
      const thisMonthMissedPct = pct(thisMonthMetrics.missed_calls, thisMonthMetrics.total_calls);

      return {
        telephony_provider: provider,
        ...metrics,
        today_total: todayLogs.length,
        yesterday_total: yesterdayLogs.length,
        last_7_days: buildLast7DaysSeries(last7Logs),
        last_7_days_answered_percentage: last7Metrics.answered_percentage,
        last_7_days_unanswered_percentage: last7Metrics.unanswered_percentage,
        last_7_days_total: last7Metrics.total_calls,
        this_month_answered_percentage: thisMonthMetrics.answered_percentage,
        this_month_missed_percentage: thisMonthMissedPct,
        this_month_total: thisMonthMetrics.total_calls,
        last_month_total: lastMonthLogs.length,
        agent_performance: buildAgentPerformance(mainLogs, profiles_by_user_id, provider, profiles_meta),
        profiles_by_user_id,
        profiles_meta,
      };
    },
  });
}

export type ProfileTelephonyMeta = {
  name: string;
  agent_identity: string | null;
};

export type CallLogsPageResult = {
  rows: CallLogRow[];
  total: number;
  profiles_by_user_id: Record<string, string>;
  profiles_meta: Record<string, ProfileTelephonyMeta>;
};

export function useCallLogs(
  filter: string,
  page: number,
  options?: {
    search?: string;
    statusFilter?: string;
    agentFilter?: string;
    customFrom?: Date;
    customTo?: Date;
    recordingsOnly?: boolean;
    pageSize?: number;
    provider?: TelephonyProviderKey;
  }
) {
  const telephonyProvider = options?.provider ?? 'twilio';
  const search = options?.search ?? '';
  const statusFilter = options?.statusFilter ?? '';
  const agentFilter = options?.agentFilter ?? '';
  const pageSize = options?.pageSize ?? 50;

  return useQuery({
    queryKey: [
      'call-logs',
      telephonyProvider,
      filter,
      search,
      statusFilter,
      agentFilter,
      page,
      options?.recordingsOnly,
      pageSize,
      options?.customFrom?.toISOString(),
      options?.customTo?.toISOString(),
    ],
    queryFn: async (): Promise<CallLogsPageResult> => {
      const ctx = await getUserContext();
      if (!ctx) throw new Error('No company found');

      const { from, to } = getCallDateRange(filter, options?.customFrom, options?.customTo);
      const fromIdx = page * pageSize;
      const toIdx = fromIdx + pageSize - 1;

      let query = callLogsTable()
        .select('*', { count: 'exact' })
        .eq('company_id', ctx.companyId)
        .gte('created_at', from)
        .lte('created_at', to)
        .order('created_at', { ascending: false });

      query = applyRoleFilter(query, ctx.role, ctx.userId);
      query = applyProviderFilter(query, telephonyProvider);

      if (options?.recordingsOnly) {
        query = query.not('recording_url', 'is', null);
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (agentFilter && agentFilter !== 'all') {
        query = query.eq('agent_id', agentFilter);
      }

      if (search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(
          `customer_number.ilike.${term},agent_number.ilike.${term},callerdesk_customer_number.ilike.${term},twilio_to_number.ilike.${term},twilio_from_number.ilike.${term}`
        );
      }

      const { data, error, count } = await query.range(fromIdx, toIdx);
      if (error) throw error;

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, agent_identity')
        .eq('company_id', ctx.companyId);

      if (profilesError) throw profilesError;

      const profiles_by_user_id: Record<string, string> = {};
      const profiles_meta: Record<string, ProfileTelephonyMeta> = {};
      for (const p of profiles || []) {
        if (p.user_id) {
          profiles_by_user_id[p.user_id] = p.name || 'Unknown';
          profiles_meta[p.user_id] = {
            name: p.name || 'Unknown',
            agent_identity: p.agent_identity ?? null,
          };
        }
      }

      const rows = filterLogsByTelephonyProvider((data || []) as CallLogRow[], telephonyProvider);

      return {
        rows,
        total: count ?? rows.length,
        profiles_by_user_id,
        profiles_meta,
      };
    },
  });
}

export function useCallLogsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    void (async () => {
      const companyId = await getUserCompanyId();
      if (!companyId || cancelled) return;

      channel = supabase
        .channel(`call-logs-${companyId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'call_logs',
            filter: `company_id=eq.${companyId}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['call-analytics'] });
            queryClient.invalidateQueries({ queryKey: ['call-logs'] });
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export function getDisplayCustomerNumber(log: CallLogRow): string {
  return (
    log.customer_number ||
    log.callerdesk_customer_number ||
    log.twilio_to_number ||
    log.twilio_from_number ||
    '—'
  );
}

export function formatCallDuration(seconds: number | null): string {
  const s = seconds || 0;
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}
