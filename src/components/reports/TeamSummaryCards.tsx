import { StatCard } from '@/components/dashboard/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  TrendingUp,
  CheckSquare,
  Zap,
  Target,
  UserCheck,
  AlertTriangle,
  CalendarCheck,
} from 'lucide-react';
import type { TeamReportSummary } from '@/hooks/useTeamReport';

type TeamSummaryCardsProps = {
  summary: TeamReportSummary;
  mostActiveName?: string;
  isLoading: boolean;
};

export function TeamSummaryCards({ summary, mostActiveName, isLoading }: TeamSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  const totalAssigned = summary.totalCompleted + summary.totalPending + summary.totalMissed;
  const taskAttendanceRate =
    totalAssigned === 0 ? null : Math.round((summary.totalCompleted / totalAssigned) * 1000) / 10;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Team Members"
          value={summary.totalMembers}
          change={`${summary.activeMembers} active in period`}
          changeType="neutral"
          icon={Users}
          iconBg="gradient-primary"
        />
        <StatCard
          title="Avg Productivity"
          value={`${summary.avgProductivity.toFixed(1)}%`}
          change={`${summary.highPerformers} high performers`}
          changeType={summary.highPerformers > 0 ? 'positive' : 'neutral'}
          icon={TrendingUp}
          iconBg="gradient-success"
        />
        <StatCard
          title="Tasks Completed"
          value={summary.totalCompleted}
          change={`${summary.totalPending} pending · ${summary.totalMissed} missed`}
          changeType="neutral"
          icon={CheckSquare}
          iconBg="gradient-info"
        />
        <StatCard
          title="CRM Engagement"
          value={`${summary.engagementRate.toFixed(1)}%`}
          change="Presence rate (logged activity)"
          changeType={
            summary.engagementRate >= 70 ? 'positive' : summary.engagementRate >= 40 ? 'neutral' : 'negative'
          }
          icon={UserCheck}
          iconBg="gradient-warning"
        />
        <StatCard
          title="Avg Task Completion"
          value={`${summary.avgCompletionRate.toFixed(1)}%`}
          change={`${summary.siteVisitsCompleted} site visits done`}
          changeType={summary.avgCompletionRate >= 70 ? 'positive' : 'neutral'}
          icon={Target}
          iconBg="gradient-primary"
        />
        <StatCard
          title="CRM Actions"
          value={summary.totalActivities}
          change={mostActiveName ? `Most active: ${mostActiveName}` : 'No activity yet'}
          changeType="neutral"
          icon={Zap}
          iconBg="gradient-info"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="stat-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-success flex items-center justify-center shrink-0">
            <CalendarCheck className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Task Attendance Rate</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">
              {taskAttendanceRate == null ? '—' : `${taskAttendanceRate.toFixed(1)}%`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Completed vs all assigned tasks</p>
          </div>
        </div>
        <div className="stat-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-info flex items-center justify-center shrink-0">
            <CalendarCheck className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Site Visit Completion</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{summary.siteVisitsCompleted}</p>
            <p className="text-xs text-muted-foreground mt-1">Completed visits in selected period</p>
          </div>
        </div>
      </div>

      {summary.needsReviewCount > 0 && (
        <div className="stat-card border border-orange-500/30 bg-orange-500/5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {summary.needsReviewCount} member{summary.needsReviewCount !== 1 ? 's' : ''} flagged for review
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              High task completion with low CRM activity — open a row to verify their work.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
