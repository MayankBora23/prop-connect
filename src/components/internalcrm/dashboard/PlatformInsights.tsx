import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Building2, AlertTriangle, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { Company } from '@/hooks/useCompany';

const COLORS = [
  'hsl(230, 80%, 55%)',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 65%, 60%)',
];

interface PlatformInsightsProps {
  industryDistribution: { name: string; value: number }[];
  recentClients: Company[];
  suspended: Company[];
  expiringTrials: Company[];
}

export function PlatformInsights({
  industryDistribution,
  recentClients,
  suspended,
  expiringTrials,
}: PlatformInsightsProps) {
  return (
    <div className="space-y-6">
      {(suspended.length > 0 || expiringTrials.length > 0) && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {suspended.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="font-medium text-foreground">Suspended accounts</p>
                <p className="text-sm text-muted-foreground">
                  {suspended.map((c) => c.name).join(', ')}
                </p>
              </div>
            </div>
          )}
          {expiringTrials.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <Clock className="h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-medium text-foreground">Trials ending within 7 days</p>
                <p className="text-sm text-muted-foreground">
                  {expiringTrials.map((c) => c.name).join(', ')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card-elevated p-6">
          <h3 className="mb-4 font-semibold">Clients by Industry</h3>
          {industryDistribution.length === 0 ? (
            <p className="text-sm text-muted-foreground">No client companies yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={industryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                >
                  {industryDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card-elevated p-6">
          <h3 className="mb-4 font-semibold">Industry Breakdown</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={industryDistribution}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(280, 65%, 55%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card-elevated p-6">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-violet-600" />
          <h3 className="font-semibold">Recently Onboarded Clients</h3>
        </div>
        {recentClients.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent signups</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {recentClients.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">{c.name}</p>
                  <p className="text-muted-foreground capitalize">
                    {c.industry?.replace(/_/g, ' ')} · {c.plan_type ?? '—'}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(parseISO(c.created_at), 'dd MMM yyyy')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
