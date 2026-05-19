import { useQuery } from '@tanstack/react-query';
import { format, eachDayOfInterval, parseISO, isWithinInterval } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import type { ProfileWithRole } from '@/hooks/useProfiles';
import type { AppRole } from '@/hooks/useCompany';

export type TeamActivityLogRow = Tables<'team_activity_log'>;

export type TeamMemberReportRow = {
  user_id: string;
  name: string;
  email: string | null;
  role: AppRole | null;
  avatar_url: string | null;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  missed_tasks: number;
  completion_rate: number;
  activity_count: number;
  site_visits_completed: number;
  engagement_rate: number;
  productivity_score: number;
  performance_label: 'High Performer' | 'Average' | 'Needs Improvement';
  needs_review: boolean;
  last_active: string | null;
};

export type TeamReportSummary = {
  totalMembers: number;
  avgProductivity: number;
  avgCompletionRate: number;
  totalCompleted: number;
  totalPending: number;
  totalMissed: number;
  totalActivities: number;
  siteVisitsCompleted: number;
  engagementRate: number;
  activeMembers: number;
  highPerformers: number;
  needsReviewCount: number;
};

export type TeamReportDailyPoint = {
  day: string;
  label: string;
  activities: number;
  tasks: number;
};

export type TeamReportPerformanceSlice = {
  name: string;
  value: number;
  color: string;
};

export type TeamReportActivityTypeSlice = {
  type: string;
  count: number;
};

export type TeamReportPayload = {
  members: TeamMemberReportRow[];
  summary: TeamReportSummary;
  dailyActivity: TeamReportDailyPoint[];
  performanceBreakdown: TeamReportPerformanceSlice[];
  activityByType: TeamReportActivityTypeSlice[];
};

const EMPTY_PAYLOAD: TeamReportPayload = {
  members: [],
  summary: {
    totalMembers: 0,
    avgProductivity: 0,
    avgCompletionRate: 0,
    totalCompleted: 0,
    totalPending: 0,
    totalMissed: 0,
    totalActivities: 0,
    siteVisitsCompleted: 0,
    engagementRate: 0,
    activeMembers: 0,
    highPerformers: 0,
    needsReviewCount: 0,
  },
  dailyActivity: [],
  performanceBreakdown: [],
  activityByType: [],
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function getDateRange(
  filter: string,
  customFrom?: Date,
  customTo?: Date
): { fromDate: string; toDate: string } {
  const now = new Date();

  if (filter === 'custom') {
    if (customFrom && customTo) {
      return {
        fromDate: startOfDay(customFrom).toISOString(),
        toDate: endOfDay(customTo).toISOString(),
      };
    }
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      fromDate: startOfDay(first).toISOString(),
      toDate: endOfDay(now).toISOString(),
    };
  }

  switch (filter) {
    case 'today':
      return {
        fromDate: startOfDay(now).toISOString(),
        toDate: endOfDay(now).toISOString(),
      };
    case 'week': {
      const day = now.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      return {
        fromDate: startOfDay(monday).toISOString(),
        toDate: endOfDay(now).toISOString(),
      };
    }
    case 'month': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        fromDate: startOfDay(first).toISOString(),
        toDate: endOfDay(now).toISOString(),
      };
    }
    case 'year': {
      const first = new Date(now.getFullYear(), 0, 1);
      return {
        fromDate: startOfDay(first).toISOString(),
        toDate: endOfDay(now).toISOString(),
      };
    }
    default:
      return {
        fromDate: startOfDay(now).toISOString(),
        toDate: endOfDay(now).toISOString(),
      };
  }
}

const PERFORMANCE_COLORS = {
  'High Performer': 'hsl(142, 76%, 36%)',
  Average: 'hsl(38, 92%, 50%)',
  'Needs Improvement': 'hsl(0, 84%, 60%)',
} as const;

function buildTeamReportPayload(
  profiles: ProfileWithRole[],
  followUps: Array<{
    id: string;
    assigned_to: string | null;
    status: string;
    created_at: string;
  }>,
  siteVisits: Array<{ id: string; assigned_to: string | null; status: string; created_at: string }>,
  activityLogs: TeamActivityLogRow[],
  fromDate: string,
  toDate: string
): TeamReportPayload {
  const rangeStart = parseISO(fromDate);
  const rangeEnd = parseISO(toDate);

  const rows: TeamMemberReportRow[] = profiles.map((p) => {
    const memberTasks = followUps.filter((fu) => fu.assigned_to === p.user_id);
    const total_tasks = memberTasks.length;
    const completed_tasks = memberTasks.filter((t) => t.status === 'completed').length;
    const missed_tasks = memberTasks.filter((t) => t.status === 'missed').length;
    const pending_tasks = memberTasks.filter(
      (t) => t.status !== 'completed' && t.status !== 'missed'
    ).length;
    const completion_rate =
      total_tasks === 0 ? 0 : Math.round((completed_tasks / total_tasks) * 1000) / 10;

    const activity_count = activityLogs.filter((a) => a.profile_user_id === p.user_id).length;
    const site_visits_completed = siteVisits.filter(
      (v) => v.assigned_to === p.user_id && v.status === 'completed'
    ).length;

    const productivity_score =
      Math.round(
        (completion_rate * 0.6 + Math.min(activity_count * 10, 100) * 0.4) * 10
      ) / 10;

    let performance_label: TeamMemberReportRow['performance_label'] = 'Needs Improvement';
    if (productivity_score >= 80) performance_label = 'High Performer';
    else if (productivity_score >= 50) performance_label = 'Average';

    const needs_review = completed_tasks > 5 && activity_count < 2;
    const engagement_rate = activity_count > 0 ? 100 : 0;

    const userActs = activityLogs
      .filter((a) => a.profile_user_id === p.user_id)
      .map((a) => new Date(a.created_at).getTime());
    const last_active =
      userActs.length === 0 ? null : new Date(Math.max(...userActs)).toISOString();

    return {
      user_id: p.user_id,
      name: p.name,
      email: p.email,
      role: p.role,
      avatar_url: p.avatar_url,
      total_tasks,
      completed_tasks,
      pending_tasks,
      missed_tasks,
      completion_rate,
      activity_count,
      site_visits_completed,
      engagement_rate,
      productivity_score,
      performance_label,
      needs_review,
      last_active,
    };
  });

  rows.sort((a, b) => b.productivity_score - a.productivity_score);

  const count = rows.length;
  const activeMembers = rows.filter((m) => m.activity_count > 0).length;
  const summary: TeamReportSummary = {
    totalMembers: count,
    avgProductivity:
      count === 0 ? 0 : Math.round((rows.reduce((s, m) => s + m.productivity_score, 0) / count) * 10) / 10,
    avgCompletionRate:
      count === 0 ? 0 : Math.round((rows.reduce((s, m) => s + m.completion_rate, 0) / count) * 10) / 10,
    totalCompleted: rows.reduce((s, m) => s + m.completed_tasks, 0),
    totalPending: rows.reduce((s, m) => s + m.pending_tasks, 0),
    totalMissed: rows.reduce((s, m) => s + m.missed_tasks, 0),
    totalActivities: activityLogs.length,
    siteVisitsCompleted: siteVisits.filter((v) => v.status === 'completed').length,
    engagementRate: count === 0 ? 0 : Math.round((activeMembers / count) * 1000) / 10,
    activeMembers,
    highPerformers: rows.filter((m) => m.performance_label === 'High Performer').length,
    needsReviewCount: rows.filter((m) => m.needs_review).length,
  };

  let days: Date[] = [];
  try {
    days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    if (days.length > 31) {
      days = days.slice(-31);
    }
  } catch {
    days = [rangeStart];
  }

  const dailyActivity: TeamReportDailyPoint[] = days.map((day) => {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    const activities = activityLogs.filter((a) => {
      const t = new Date(a.created_at);
      return isWithinInterval(t, { start: dayStart, end: dayEnd });
    }).length;
    const tasks = followUps.filter((f) => {
      const t = new Date(f.created_at);
      return isWithinInterval(t, { start: dayStart, end: dayEnd });
    }).length;
    return {
      day: format(day, 'yyyy-MM-dd'),
      label: format(day, 'MMM d'),
      activities,
      tasks,
    };
  });

  const perfCounts: Record<string, number> = {
    'High Performer': 0,
    Average: 0,
    'Needs Improvement': 0,
  };
  for (const m of rows) perfCounts[m.performance_label]++;

  const performanceBreakdown: TeamReportPerformanceSlice[] = (
    Object.keys(perfCounts) as Array<keyof typeof PERFORMANCE_COLORS>
  )
    .filter((k) => perfCounts[k] > 0)
    .map((k) => ({
      name: k,
      value: perfCounts[k],
      color: PERFORMANCE_COLORS[k],
    }));

  const typeMap = activityLogs.reduce<Record<string, number>>((acc, log) => {
    const key = log.action_type.replace(/_/g, ' ');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const activityByType: TeamReportActivityTypeSlice[] = Object.entries(typeMap)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    members: rows,
    summary,
    dailyActivity,
    performanceBreakdown,
    activityByType,
  };
}

export function useTeamReport(filter: string, customFrom?: Date | null, customTo?: Date | null) {
  const from = customFrom ?? undefined;
  const to = customTo ?? undefined;

  return useQuery({
    queryKey: ['team-report', filter, from?.toISOString(), to?.toISOString()],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) return EMPTY_PAYLOAD;

      const { data: me } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!me?.company_id) return EMPTY_PAYLOAD;

      const company_id = me.company_id;
      const { fromDate, toDate } = getDateRange(filter, from, to);

      const [profilesRes, followUpsRes, siteVisitsRes, activityRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('company_id', company_id)
          .order('name', { ascending: true }),
        supabase
          .from('follow_ups')
          .select('id, assigned_to, status, type, follow_up_date, created_at, updated_at')
          .eq('company_id', company_id)
          .gte('created_at', fromDate)
          .lte('created_at', toDate),
        supabase
          .from('site_visits')
          .select('id, assigned_to, status, created_at')
          .eq('company_id', company_id)
          .gte('created_at', fromDate)
          .lte('created_at', toDate),
        supabase
          .from('team_activity_log')
          .select('*')
          .eq('company_id', company_id)
          .gte('created_at', fromDate)
          .lte('created_at', toDate),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (followUpsRes.error) throw followUpsRes.error;
      if (siteVisitsRes.error) throw siteVisitsRes.error;
      if (activityRes.error) throw activityRes.error;

      const rolesRes = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('company_id', company_id);

      if (rolesRes.error) throw rolesRes.error;

      const rolesMap = new Map((rolesRes.data || []).map((r) => [r.user_id, r.role]));

      const profiles: ProfileWithRole[] = (profilesRes.data || []).map((profile) => ({
        ...profile,
        role: rolesMap.get(profile.user_id) || null,
      })) as ProfileWithRole[];

      const followUps = followUpsRes.data || [];
      const activityLogs = (activityRes.data || []) as TeamActivityLogRow[];

      return buildTeamReportPayload(
        profiles,
        followUps,
        siteVisitsRes.data ?? [],
        activityLogs,
        fromDate,
        toDate
      );
    },
  });
}

export type TeamMemberDetailTask = {
  id: string;
  type: string;
  status: string;
  follow_up_date: string;
  follow_up_time: string;
  lead_name: string | null;
};

export function useTeamMemberDetail(
  profileUserId: string,
  filter: string,
  customFrom?: Date | null,
  customTo?: Date | null,
  options?: { enabled?: boolean }
) {
  const from = customFrom ?? undefined;
  const to = customTo ?? undefined;
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: [
      'team-member-detail',
      profileUserId,
      filter,
      from?.toISOString(),
      to?.toISOString(),
    ],
    enabled: enabled && !!profileUserId,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error('Not authenticated');

      const { data: me } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!me?.company_id) throw new Error('No company');

      const company_id = me.company_id;
      const { fromDate, toDate } = getDateRange(filter, from, to);

      const [memberProfileRes, tasksRes, activitiesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', profileUserId).eq('company_id', company_id).maybeSingle(),
        supabase
          .from('follow_ups')
          .select(
            `
            id,
            type,
            status,
            follow_up_date,
            follow_up_time,
            leads!follow_ups_lead_id_fkey(name)
          `
          )
          .eq('company_id', company_id)
          .eq('assigned_to', profileUserId)
          .gte('created_at', fromDate)
          .lte('created_at', toDate)
          .order('follow_up_date', { ascending: true }),
        supabase
          .from('team_activity_log')
          .select('*')
          .eq('company_id', company_id)
          .eq('profile_user_id', profileUserId)
          .gte('created_at', fromDate)
          .lte('created_at', toDate)
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      if (memberProfileRes.error) throw memberProfileRes.error;
      if (tasksRes.error) throw tasksRes.error;
      if (activitiesRes.error) throw activitiesRes.error;

      const roleRes = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profileUserId)
        .eq('company_id', company_id)
        .maybeSingle();

      const base = memberProfileRes.data;
      if (!base) {
        return {
          member: null as ProfileWithRole | null,
          tasks: [] as TeamMemberDetailTask[],
          activities: [] as TeamActivityLogRow[],
          completed_tasks: 0,
          pending_tasks: 0,
          activity_count: 0,
          productivity_score: 0,
          needs_review: false,
        };
      }

      const member: ProfileWithRole = {
        ...base,
        role: roleRes.data?.role || null,
      } as ProfileWithRole;

      const rawTasks = tasksRes.data || [];
      const tasks: TeamMemberDetailTask[] = rawTasks.map((t: any) => ({
        id: t.id,
        type: t.type,
        status: t.status,
        follow_up_date: t.follow_up_date,
        follow_up_time: t.follow_up_time,
        lead_name: t.leads?.name ?? null,
      }));

      tasks.sort((a, b) => {
        const aDone = a.status === 'completed' ? 1 : 0;
        const bDone = b.status === 'completed' ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        return a.follow_up_date.localeCompare(b.follow_up_date);
      });

      const activities = (activitiesRes.data || []) as TeamActivityLogRow[];

      const completed_tasks = tasks.filter((t) => t.status === 'completed').length;
      const pending_tasks = tasks.filter((t) => t.status !== 'completed').length;
      const total_tasks = tasks.length;
      const completion_rate =
        total_tasks === 0 ? 0 : Math.round((completed_tasks / total_tasks) * 1000) / 10;
      const activity_count = activities.length;
      const productivity_score =
        Math.round(
          (completion_rate * 0.6 + Math.min(activity_count * 10, 100) * 0.4) * 10
        ) / 10;
      const needs_review = completed_tasks > 5 && activity_count < 2;

      return {
        member,
        tasks,
        activities,
        completed_tasks,
        pending_tasks,
        activity_count,
        productivity_score,
        needs_review,
      };
    },
  });
}
