import { useState, useMemo, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { BarChart3, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTeamReport, getDateRange } from '@/hooks/useTeamReport';
import { useCurrentProfile } from '@/hooks/useProfiles';
import { ReportFilterBar } from '@/components/reports/ReportFilterBar';
import { TeamSummaryCards } from '@/components/reports/TeamSummaryCards';
import { TopPerformersBar } from '@/components/reports/TopPerformersBar';
import { TopPerformersList } from '@/components/reports/TopPerformersList';
import { TeamReportTable } from '@/components/reports/TeamReportTable';
import { TeamReportCharts } from '@/components/reports/TeamReportCharts';
import { TeamMemberDetailSheet } from '@/components/reports/TeamMemberDetailSheet';
import type { TeamMemberReportRow } from '@/hooks/useTeamReport';

function escapeCsvCell(value: string) {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function TeamReportView() {
  const [activeFilter, setActiveFilter] = useState('month');
  const [customFrom, setCustomFrom] = useState<Date | null>(null);
  const [customTo, setCustomTo] = useState<Date | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: currentProfile } = useCurrentProfile();
  const { data: reportPayload, isLoading } = useTeamReport(activeFilter, customFrom, customTo);

  const reportData = useMemo(() => {
    const members = reportPayload?.members ?? [];
    const role = currentProfile?.role;
    if (role === 'sales' && currentProfile?.user_id) {
      return members.filter((m) => m.user_id === currentProfile.user_id);
    }
    return members;
  }, [reportPayload?.members, currentProfile?.role, currentProfile?.user_id]);

  const summary = useMemo(() => {
    const count = reportData.length;
    if (count === 0) {
      return reportPayload?.summary;
    }
    const activeMembers = reportData.filter((m) => m.activity_count > 0).length;
    return {
      totalMembers: count,
      avgProductivity:
        Math.round((reportData.reduce((s, m) => s + m.productivity_score, 0) / count) * 10) / 10,
      avgCompletionRate:
        Math.round((reportData.reduce((s, m) => s + m.completion_rate, 0) / count) * 10) / 10,
      totalCompleted: reportData.reduce((s, m) => s + m.completed_tasks, 0),
      totalPending: reportData.reduce((s, m) => s + m.pending_tasks, 0),
      totalMissed: reportData.reduce((s, m) => s + m.missed_tasks, 0),
      totalActivities: reportData.reduce((s, m) => s + m.activity_count, 0),
      siteVisitsCompleted: reportData.reduce((s, m) => s + m.site_visits_completed, 0),
      engagementRate: Math.round((activeMembers / count) * 1000) / 10,
      activeMembers,
      highPerformers: reportData.filter((m) => m.performance_label === 'High Performer').length,
      needsReviewCount: reportData.filter((m) => m.needs_review).length,
    };
  }, [reportData, reportPayload?.summary]);

  const mostActiveName = useMemo(() => {
    if (reportData.length === 0) return undefined;
    return [...reportData].sort((a, b) => b.activity_count - a.activity_count)[0]?.name;
  }, [reportData]);

  const showTopPerformers =
    currentProfile?.role !== 'sales' && reportData.length >= 2;

  const rangeSubtitle = useMemo(() => {
    const { fromDate, toDate } = getDateRange(activeFilter, customFrom ?? undefined, customTo ?? undefined);
    const a = format(parseISO(fromDate), 'MMM d, yyyy');
    const b = format(parseISO(toDate), 'MMM d, yyyy');
    return a === b ? a : `${a} – ${b}`;
  }, [activeFilter, customFrom, customTo]);

  const onCustomRangeChange = useCallback((from: Date, to: Date) => {
    setCustomFrom(from);
    setCustomTo(to);
  }, []);

  const onFilterChange = useCallback((filter: string) => {
    setActiveFilter(filter);
    if (filter !== 'custom') {
      setCustomFrom(null);
      setCustomTo(null);
    }
  }, []);

  const onMemberClick = useCallback((profileUserId: string, name: string) => {
    setSelectedUserId(profileUserId);
    setSelectedUserName(name);
    setSheetOpen(true);
  }, []);

  const exportCsv = useCallback(() => {
    const headers = [
      'Name',
      'Role',
      'Tasks Assigned',
      'Completed',
      'Pending',
      'Missed',
      'Completion Rate',
      'Activity Count',
      'Site Visits',
      'Engagement',
      'Productivity Score',
      'Performance',
      'Last Active',
      'Review Flag',
    ];
    const lines = [headers.join(',')];
    for (const m of reportData) {
      const last =
        m.last_active == null ? 'Never' : format(parseISO(m.last_active), 'yyyy-MM-dd HH:mm');
      const row = [
        escapeCsvCell(m.name),
        escapeCsvCell(m.role ?? ''),
        String(m.total_tasks),
        String(m.completed_tasks),
        String(m.pending_tasks),
        String(m.missed_tasks),
        `${m.completion_rate.toFixed(1)}%`,
        String(m.activity_count),
        String(m.site_visits_completed),
        `${m.engagement_rate}%`,
        m.productivity_score.toFixed(1),
        escapeCsvCell(m.performance_label),
        escapeCsvCell(last),
        m.needs_review ? 'Yes' : 'No',
      ];
      lines.push(row.join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team-performance-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [reportData]);

  const chartProps = {
    reportData,
    dailyActivity: reportPayload?.dailyActivity ?? [],
    performanceBreakdown: reportPayload?.performanceBreakdown ?? [],
    activityByType: reportPayload?.activityByType ?? [],
  };

  return (
    <>
      <div className="print:hidden space-y-8 animate-fade-in">
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-6 md:p-8">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shrink-0 shadow-lg">
                <BarChart3 className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                  Team Performance Report
                </h1>
                <p className="text-sm text-muted-foreground mt-1">{rangeSubtitle}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  CRM team productivity from profiles, tasks, and logged activity
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={exportCsv}>
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
                <Printer className="w-4 h-4" />
                Print / PDF
              </Button>
            </div>
          </div>
        </div>

        <ReportFilterBar
          activeFilter={activeFilter}
          onFilterChange={onFilterChange}
          customFrom={customFrom}
          customTo={customTo}
          onCustomRangeChange={onCustomRangeChange}
        />

        {summary && (
          <TeamSummaryCards summary={summary} mostActiveName={mostActiveName} isLoading={isLoading} />
        )}

        {showTopPerformers && <TopPerformersBar reportData={reportData} />}

        {(showTopPerformers || reportData.length > 0) && (
          <TopPerformersList reportData={reportData} onMemberClick={onMemberClick} />
        )}

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="overview">Team Table</TabsTrigger>
            <TabsTrigger value="analytics">Full Analytics</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4 mt-6">
            <TeamReportTable reportData={reportData} isLoading={isLoading} onMemberClick={onMemberClick} />
          </TabsContent>
          <TabsContent value="analytics" className="mt-6">
            <TeamReportCharts {...chartProps} />
          </TabsContent>
        </Tabs>

        {selectedUserId && (
          <TeamMemberDetailSheet
            profileUserId={selectedUserId}
            memberName={selectedUserName}
            filter={activeFilter}
            customFrom={customFrom}
            customTo={customTo}
            open={sheetOpen}
            onOpenChange={setSheetOpen}
          />
        )}
      </div>

      <div className="hidden print:block p-6">
        <h1 className="text-xl font-bold mb-2">Team Performance Report</h1>
        <p className="text-sm text-muted-foreground mb-4">{rangeSubtitle}</p>
        <div className="overflow-x-auto">
<table className="w-full text-sm border-collapse border border-foreground/20">

          <thead>
            <tr>
              <th className="border border-foreground/20 p-2 text-left">Rank</th>
              <th className="border border-foreground/20 p-2 text-left">Name</th>
              <th className="border border-foreground/20 p-2 text-left">Role</th>
              <th className="border border-foreground/20 p-2 text-right">Assigned</th>
              <th className="border border-foreground/20 p-2 text-right">Completed</th>
              <th className="border border-foreground/20 p-2 text-right">Pending</th>
              <th className="border border-foreground/20 p-2 text-right">Completion %</th>
              <th className="border border-foreground/20 p-2 text-right">Activity</th>
              <th className="border border-foreground/20 p-2 text-right">Score</th>
              <th className="border border-foreground/20 p-2 text-left">Performance</th>
              <th className="border border-foreground/20 p-2 text-left">Last Active</th>
              <th className="border border-foreground/20 p-2 text-left">Review</th>
            </tr>
          </thead>
          <tbody>
            {reportData.map((m: TeamMemberReportRow, i: number) => (
              <tr key={m.user_id}>
                <td className="border border-foreground/20 p-2">{i + 1}</td>
                <td className="border border-foreground/20 p-2">{m.name}</td>
                <td className="border border-foreground/20 p-2">{m.role ?? ''}</td>
                <td className="border border-foreground/20 p-2 text-right">{m.total_tasks}</td>
                <td className="border border-foreground/20 p-2 text-right">{m.completed_tasks}</td>
                <td className="border border-foreground/20 p-2 text-right">{m.pending_tasks}</td>
                <td className="border border-foreground/20 p-2 text-right">{m.completion_rate.toFixed(1)}</td>
                <td className="border border-foreground/20 p-2 text-right">{m.activity_count}</td>
                <td className="border border-foreground/20 p-2 text-right">{m.productivity_score.toFixed(1)}</td>
                <td className="border border-foreground/20 p-2">{m.performance_label}</td>
                <td className="border border-foreground/20 p-2">
                  {m.last_active ? format(parseISO(m.last_active), 'yyyy-MM-dd HH:mm') : 'Never'}
                </td>
                <td className="border border-foreground/20 p-2">{m.needs_review ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        
</table>
</div>
      </div>
    </>
  );
}
