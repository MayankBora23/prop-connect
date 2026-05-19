import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  ComposedChart,
  Line,
} from 'recharts';
import type {
  TeamMemberReportRow,
  TeamReportDailyPoint,
  TeamReportPerformanceSlice,
  TeamReportActivityTypeSlice,
} from '@/hooks/useTeamReport';

const COLORS = [
  'hsl(230, 80%, 55%)',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(199, 89%, 48%)',
  'hsl(280, 65%, 60%)',
];

type TeamReportChartsProps = {
  reportData: TeamMemberReportRow[];
  dailyActivity: TeamReportDailyPoint[];
  performanceBreakdown: TeamReportPerformanceSlice[];
  activityByType: TeamReportActivityTypeSlice[];
  compact?: boolean;
};

function truncateName(name: string) {
  return name.length > 10 ? `${name.slice(0, 10)}…` : name;
}

function barColorForScore(score: number) {
  if (score >= 80) return '#22c55e';
  if (score >= 50) return '#eab308';
  return '#ef4444';
}

export function TeamReportCharts({
  reportData,
  dailyActivity,
  performanceBreakdown,
  activityByType,
  compact = false,
}: TeamReportChartsProps) {
  const chartHeight = compact ? 220 : 280;

  const completedData = reportData.map((m) => ({
    name: truncateName(m.name),
    fullName: m.name,
    completed: m.completed_tasks,
    pending: m.pending_tasks,
  }));

  const scoreData = reportData.map((m) => ({
    name: truncateName(m.name),
    fullName: m.name,
    score: m.productivity_score,
    fill: barColorForScore(m.productivity_score),
  }));

  const engagementData = reportData.map((m) => ({
    name: truncateName(m.name),
    fullName: m.name,
    rate: m.engagement_rate,
    activities: m.activity_count,
  }));

  const totalCompleted = reportData.reduce((s, m) => s + m.completed_tasks, 0);
  const totalPending = reportData.reduce((s, m) => s + m.pending_tasks, 0);
  const taskPieData = [
    { name: 'Completed', value: totalCompleted, color: '#22c55e' },
    { name: 'Pending', value: totalPending, color: '#f97316' },
  ];

  return (
    <div className="space-y-6">
      {dailyActivity.length > 0 && (
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-1">CRM Activity & Tasks Trend</h3>
          <p className="text-xs text-muted-foreground mb-4">Daily logged actions and new follow-ups</p>
          <div style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyActivity}>
                <defs>
                  <linearGradient id="teamColorActivities" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(230, 80%, 55%)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(230, 80%, 55%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="teamColorTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="activities"
                  name="CRM Actions"
                  stroke="hsl(230, 80%, 55%)"
                  fill="url(#teamColorActivities)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="tasks"
                  name="New Tasks"
                  stroke="hsl(142, 76%, 36%)"
                  fill="url(#teamColorTasks)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-1">Tasks Completed per Member</h3>
          <p className="text-xs text-muted-foreground mb-4">Assigned follow-ups marked complete</p>
          <div style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={completedData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number, name: string) => [value, name === 'completed' ? 'Completed' : 'Pending']}
                  labelFormatter={(_, payload) => (payload[0]?.payload?.fullName as string) ?? ''}
                />
                <Legend />
                <Bar dataKey="completed" name="Completed" fill="hsl(230, 80%, 55%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-1">Productivity Scores</h3>
          <p className="text-xs text-muted-foreground mb-4">Weighted task completion + CRM activity</p>
          <div style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => [value.toFixed(1), 'Score']}
                  labelFormatter={(_, payload) => (payload[0]?.payload?.fullName as string) ?? ''}
                />
                <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="4 4" label={{ value: 'High', fill: '#22c55e', fontSize: 10 }} />
                <ReferenceLine y={50} stroke="#eab308" strokeDasharray="4 4" label={{ value: 'Avg', fill: '#eab308', fontSize: 10 }} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {scoreData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-1">Task Distribution</h3>
          <p className="text-xs text-muted-foreground mb-4">Team-wide completion split</p>
          <div style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={taskPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={compact ? 70 : 90}
                  labelLine={true}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {taskPieData.map((entry, index) => (
                    <Cell key={`task-pie-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {performanceBreakdown.length > 0 && (
          <div className="card-elevated p-6">
            <h3 className="font-semibold text-foreground mb-1">Performance Mix</h3>
            <p className="text-xs text-muted-foreground mb-4">High · Average · Needs improvement</p>
            <div style={{ height: chartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={performanceBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={compact ? 70 : 90}
                    labelLine={true}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {performanceBreakdown.map((entry, index) => (
                      <Cell key={`perf-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {activityByType.length > 0 && (
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-1">CRM Actions by Type</h3>
          <p className="text-xs text-muted-foreground mb-4">What the team logged most</p>
          <div style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityByType} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="type" width={100} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" name="Actions" radius={[0, 4, 4, 0]}>
                  {activityByType.map((_, index) => (
                    <Cell key={`act-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {engagementData.length > 0 && !compact && (
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-1">CRM Engagement by Member</h3>
          <p className="text-xs text-muted-foreground mb-4">CRM actions logged in the selected period</p>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    value,
                    name === 'activities' ? 'CRM Actions' : 'Engagement %',
                  ]}
                  labelFormatter={(_, payload) => (payload[0]?.payload?.fullName as string) ?? ''}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="activities" name="CRM Actions" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="rate" name="Engagement %" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
