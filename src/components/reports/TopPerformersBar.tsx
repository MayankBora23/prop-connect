import { Trophy, Zap, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTeamRoleBadge } from '@/lib/teamRoleBadge';
import type { TeamMemberReportRow } from '@/hooks/useTeamReport';

type TopPerformersBarProps = {
  reportData: TeamMemberReportRow[];
};

export function TopPerformersBar({ reportData }: TopPerformersBarProps) {
  if (reportData.length < 2) return null;

  const byScore = [...reportData].sort((a, b) => b.productivity_score - a.productivity_score)[0];
  const byActivity = [...reportData].sort((a, b) => b.activity_count - a.activity_count)[0];
  const byCompletion = [...reportData].sort((a, b) => b.completion_rate - a.completion_rate)[0];

  const cards = [
    {
      title: 'Best Performer',
      icon: Trophy,
      member: byScore,
      metricLabel: 'Productivity score',
      metricValue: byScore.productivity_score.toFixed(1),
      gradient: 'from-amber-500/20 via-amber-400/10 to-transparent',
      border: 'border-amber-400/50',
      iconWrap: 'gradient-warning',
    },
    {
      title: 'Most Active',
      icon: Zap,
      member: byActivity,
      metricLabel: 'CRM actions',
      metricValue: String(byActivity.activity_count),
      gradient: 'from-blue-500/20 via-blue-400/10 to-transparent',
      border: 'border-primary/40',
      iconWrap: 'gradient-primary',
    },
    {
      title: 'Most Consistent',
      icon: Target,
      member: byCompletion,
      metricLabel: 'Task completion',
      metricValue: `${byCompletion.completion_rate.toFixed(1)}%`,
      gradient: 'from-green-500/20 via-green-400/10 to-transparent',
      border: 'border-green-500/40',
      iconWrap: 'gradient-success',
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        const badge = getTeamRoleBadge(c.member.role);
        const initials = c.member.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();

        return (
          <div
            key={c.title}
            className={cn(
              'card-elevated p-5 border-2 relative overflow-hidden',
              c.border,
              `bg-gradient-to-br ${c.gradient}`
            )}
          >
            <div className="flex items-start gap-4">
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', c.iconWrap)}>
                <Icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.title}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{c.member.name}</p>
                    <span className={cn('text-[10px] px-1.5 py-0 rounded-full font-medium', badge.className)}>
                      {badge.label}
                    </span>
                  </div>
                </div>
                <p className="text-3xl font-bold tabular-nums mt-3">{c.metricValue}</p>
                <p className="text-xs text-muted-foreground">{c.metricLabel}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
