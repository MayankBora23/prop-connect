import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import type { CallAnalyticsData } from '@/hooks/useCallAnalytics';

interface CallChartsSectionProps {
  analytics?: CallAnalyticsData;
  isLoading: boolean;
}

const STATUS_COLORS = {
  answered: '#22c55e',
  unanswered: '#f97316',
  missed: '#ef4444',
  failed: '#6b7280',
};

export function CallChartsSection({ analytics, isLoading }: CallChartsSectionProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-56 w-full" />
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-56 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-56 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const statusData = [
    { name: 'Answered', value: analytics?.answered_calls || 0, color: STATUS_COLORS.answered },
    { name: 'Unanswered', value: analytics?.unanswered_calls || 0, color: STATUS_COLORS.unanswered },
    { name: 'Missed', value: analytics?.missed_calls || 0, color: STATUS_COLORS.missed },
    { name: 'Failed', value: analytics?.failed_calls || 0, color: STATUS_COLORS.failed },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Calls per Day</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analytics?.last_7_days || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => {
                  const d = new Date(date);
                  return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
                }}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6" />
              <Bar dataKey="answered" fill={STATUS_COLORS.answered} />
              <Bar dataKey="unanswered" fill={STATUS_COLORS.unanswered} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Call Status Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Answered vs Unanswered Trend</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={analytics?.last_7_days || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => {
                    const d = new Date(date);
                    return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
                  }}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="answered" stroke={STATUS_COLORS.answered} strokeWidth={2} />
                <Line type="monotone" dataKey="unanswered" stroke={STATUS_COLORS.unanswered} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
