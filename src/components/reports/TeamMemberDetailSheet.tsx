import { Fragment, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTeamMemberDetail } from '@/hooks/useTeamReport';
import { getTeamRoleBadge } from '@/lib/teamRoleBadge';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import type { TeamActivityLogRow } from '@/hooks/useTeamReport';

type TeamMemberDetailSheetProps = {
  profileUserId: string;
  memberName: string;
  filter: string;
  customFrom: Date | null;
  customTo: Date | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function typeBadgeClass(type: string) {
  switch (type) {
    case 'call':
      return 'bg-blue-500/15 text-blue-700 dark:text-blue-300';
    case 'meeting':
      return 'bg-purple-500/15 text-purple-700 dark:text-purple-300';
    case 'whatsapp':
      return 'bg-green-500/15 text-green-700 dark:text-green-300';
    case 'email':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-green-600 hover:bg-green-600 text-white';
    case 'pending':
      return 'bg-yellow-500 text-yellow-950 hover:bg-yellow-500';
    case 'missed':
      return 'bg-red-600 hover:bg-red-600 text-white';
    default:
      return 'bg-muted';
  }
}

function actionBadgeClass(action: string) {
  switch (action) {
    case 'lead_created':
      return 'bg-blue-500/20 text-blue-800 dark:text-blue-200';
    case 'lead_updated':
      return 'bg-blue-500/10 text-blue-700';
    case 'follow_up_completed':
      return 'bg-green-500/20 text-green-800';
    case 'follow_up_created':
      return 'bg-cyan-500/15 text-cyan-800';
    case 'site_visit_logged':
      return 'bg-orange-500/15 text-orange-800';
    case 'auto_lead_updated':
      return 'bg-violet-500/15 text-violet-800';
    case 'note_added':
      return 'bg-slate-500/15 text-slate-800';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function formatActivityGroupLabel(iso: string) {
  const d = parseISO(iso);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
}

function groupKey(iso: string) {
  return format(parseISO(iso), 'yyyy-MM-dd');
}

export function TeamMemberDetailSheet({
  profileUserId,
  memberName,
  filter,
  customFrom,
  customTo,
  open,
  onOpenChange,
}: TeamMemberDetailSheetProps) {
  const { data, isLoading } = useTeamMemberDetail(profileUserId, filter, customFrom, customTo, {
    enabled: open && !!profileUserId,
  });

  const activitiesDisplay = useMemo(() => (data?.activities ?? []).slice(0, 50), [data?.activities]);

  const groupedActivities = useMemo(() => {
    const groups: { key: string; label: string; items: TeamActivityLogRow[] }[] = [];
    for (const row of activitiesDisplay) {
      const key = groupKey(row.created_at);
      const label = formatActivityGroupLabel(row.created_at);
      const last = groups[groups.length - 1];
      if (last && last.key === key) {
        last.items.push(row);
      } else {
        groups.push({ key, label, items: [row] });
      }
    }
    return groups;
  }, [activitiesDisplay]);

  const roleBadge = getTeamRoleBadge(data?.member?.role);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full md:w-[680px] overflow-y-auto">
        <SheetHeader className="text-left space-y-2">
          <SheetTitle>{memberName}</SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-2">
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', roleBadge.className)}>
              {roleBadge.label}
            </span>
            <span className="text-muted-foreground">{data?.member?.email ?? ''}</span>
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground mt-6">Loading…</p>
        ) : (
          <div className="mt-6 space-y-6">
            {data?.needs_review && (
              <Alert variant="destructive">
                <AlertTitle>Flagged for Review</AlertTitle>
                <AlertDescription>
                  This team member has completed multiple tasks without corresponding CRM activity. Please verify
                  their work.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Tasks Completed</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{data?.completed_tasks ?? 0}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Pending Tasks</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{data?.pending_tasks ?? 0}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Total CRM Activities</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{data?.activity_count ?? 0}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Productivity Score</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{data?.productivity_score?.toFixed(1) ?? '0.0'}</CardContent>
              </Card>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">Tasks</h3>
              {!data?.tasks.length ? (
                <p className="text-sm text-muted-foreground border rounded-md p-4">No tasks in this period</p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.tasks.map((t) => {
                        const title = [t.lead_name, t.type].filter(Boolean).join(' · ');
                        return (
                          <TableRow key={t.id}>
                            <TableCell className="font-medium">{title || 'Follow-up'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn('text-xs capitalize', typeBadgeClass(t.type))}>
                                {t.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {t.follow_up_date} {t.follow_up_time}
                            </TableCell>
                            <TableCell>
                              <Badge className={cn('capitalize', statusBadgeClass(t.status))}>{t.status}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">Activity Log</h3>
              {activitiesDisplay.length === 0 ? (
                <p className="text-sm text-muted-foreground border rounded-md p-4">
                  No CRM activity recorded in this period.
                </p>
              ) : (
                <div className="space-y-6">
                  {groupedActivities.map((g) => (
                    <Fragment key={g.key}>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b pb-1">
                        {g.label}
                      </div>
                      <ul className="space-y-3">
                        {g.items.map((row) => (
                          <li key={row.id} className="flex gap-3 text-sm">
                            <span className="tabular-nums text-muted-foreground w-12 shrink-0">
                              {format(parseISO(row.created_at), 'HH:mm')}
                            </span>
                            <Badge variant="outline" className={cn('shrink-0 text-[10px] h-5', actionBadgeClass(row.action_type))}>
                              {row.action_type}
                            </Badge>
                            <span className="text-foreground">{row.description}</span>
                          </li>
                        ))}
                      </ul>
                    </Fragment>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
