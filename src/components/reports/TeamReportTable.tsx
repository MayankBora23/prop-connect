import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { getTeamRoleBadge } from '@/lib/teamRoleBadge';
import type { TeamMemberReportRow } from '@/hooks/useTeamReport';

type TeamReportTableProps = {
  reportData: TeamMemberReportRow[];
  isLoading: boolean;
  onMemberClick: (profileUserId: string, name: string) => void;
};

function completionBarColor(rate: number) {
  if (rate >= 70) return 'bg-green-500';
  if (rate >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

function performanceBadge(perf: TeamMemberReportRow['performance_label']) {
  switch (perf) {
    case 'High Performer':
      return <Badge className="bg-green-600 hover:bg-green-600">High Performer</Badge>;
    case 'Average':
      return <Badge className="bg-yellow-500 text-yellow-950 hover:bg-yellow-500">Average</Badge>;
    default:
      return <Badge variant="destructive">Needs Improvement</Badge>;
  }
}

export function TeamReportTable({ reportData, isLoading, onMemberClick }: TeamReportTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Rank</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Assigned</TableHead>
              <TableHead className="text-right">Done</TableHead>
              <TableHead className="text-right">Pending</TableHead>
              <TableHead>Completion</TableHead>
              <TableHead className="text-right">Activity</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead>Performance</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead>Flag</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 12 }).map((__, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (reportData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border rounded-lg">
        <Users className="h-12 w-12 mb-3 opacity-50" />
        <p>No team report data for this period.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Rank</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Tasks Assigned</TableHead>
            <TableHead className="text-right">Completed</TableHead>
            <TableHead className="text-right">Pending</TableHead>
            <TableHead className="min-w-[120px]">Completion Rate</TableHead>
            <TableHead className="text-right">Activity Count</TableHead>
            <TableHead className="text-right">Productivity Score</TableHead>
            <TableHead>Performance</TableHead>
            <TableHead>Last Active</TableHead>
            <TableHead>Flag</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reportData.map((row, index) => {
            const rank = index + 1;
            const initials = row.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();
            const roleBadge = getTeamRoleBadge(row.role);
            const last =
              row.last_active == null
                ? 'Never'
                : formatDistanceToNow(new Date(row.last_active), { addSuffix: true });

            return (
              <TableRow
                key={row.user_id}
                className="cursor-pointer hover:bg-muted/60"
                onClick={() => onMemberClick(row.user_id, row.name)}
              >
                <TableCell className="font-medium">{rank}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                      {initials}
                    </div>
                    <span className="font-medium">{row.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', roleBadge.className)}>
                    {roleBadge.label}
                  </span>
                </TableCell>
                <TableCell className="text-right">{row.total_tasks}</TableCell>
                <TableCell className="text-right">{row.completed_tasks}</TableCell>
                <TableCell className="text-right">{row.pending_tasks}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 min-w-[100px]">
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', completionBarColor(row.completion_rate))}
                        style={{ width: `${Math.min(100, row.completion_rate)}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums w-10 text-right">{row.completion_rate.toFixed(1)}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">{row.activity_count}</TableCell>
                <TableCell className={cn('text-right font-bold tabular-nums', scoreColor(row.productivity_score))}>
                  {row.productivity_score.toFixed(1)}
                </TableCell>
                <TableCell>{performanceBadge(row.performance_label)}</TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{last}</TableCell>
                <TableCell>
                  {row.needs_review ? (
                    <Badge className="bg-orange-500 hover:bg-orange-500 text-white">Review</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
