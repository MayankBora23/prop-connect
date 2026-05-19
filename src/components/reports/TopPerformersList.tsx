import { Medal, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTeamRoleBadge } from '@/lib/teamRoleBadge';
import type { TeamMemberReportRow } from '@/hooks/useTeamReport';

type TopPerformersListProps = {
  reportData: TeamMemberReportRow[];
  onMemberClick?: (profileUserId: string, name: string) => void;
  limit?: number;
};

const RANK_STYLES = [
  'bg-amber-500/15 text-amber-600 border-amber-400/40',
  'bg-slate-400/15 text-slate-600 border-slate-400/40',
  'bg-orange-600/15 text-orange-700 border-orange-500/40',
] as const;

function scoreBarColor(score: number) {
  if (score >= 80) return 'bg-green-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function TopPerformersList({ reportData, onMemberClick, limit = 8 }: TopPerformersListProps) {
  if (reportData.length === 0) {
    return (
      <div className="card-elevated p-6 text-center text-muted-foreground text-sm">
        No team data for this period.
      </div>
    );
  }

  const ranked = reportData.slice(0, limit);

  return (
    <div className="card-elevated p-6 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Medal className="w-5 h-5 text-amber-500" />
        <h3 className="font-semibold text-foreground">Leaderboard</h3>
        <span className="text-xs text-muted-foreground ml-auto">By productivity score</span>
      </div>
      <ul className="space-y-2 flex-1 overflow-y-auto max-h-[420px] pr-1">
        {ranked.map((member, index) => {
          const rank = index + 1;
          const initials = member.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
          const roleBadge = getTeamRoleBadge(member.role);
          const rankStyle = RANK_STYLES[index] ?? 'bg-muted text-muted-foreground border-border';

          return (
            <li key={member.user_id}>
              <button
                type="button"
                onClick={() => onMemberClick?.(member.user_id, member.name)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left',
                  'hover:bg-muted/60 hover:border-primary/20',
                  rank <= 3 && 'bg-muted/30'
                )}
              >
                <span
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border shrink-0',
                    rankStyle
                  )}
                >
                  {rank}
                </span>
                <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{member.name}</p>
                  <span className={cn('text-[10px] px-1.5 py-0 rounded-full font-medium', roleBadge.className)}>
                    {roleBadge.label}
                  </span>
                  <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', scoreBarColor(member.productivity_score))}
                      style={{ width: `${Math.min(100, member.productivity_score)}%` }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold tabular-nums">{member.productivity_score.toFixed(1)}</p>
                  <p className="text-[10px] text-muted-foreground">{member.completed_tasks} done</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
