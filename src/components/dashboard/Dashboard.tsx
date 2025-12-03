import { Users, TrendingUp, Calendar, CheckCircle2, XCircle, Flame } from 'lucide-react';
import { StatCard } from './StatCard';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useLeads } from '@/hooks/useLeads';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const COLORS = ['hsl(230, 80%, 55%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(199, 89%, 48%)', 'hsl(280, 65%, 60%)', 'hsl(340, 75%, 55%)'];

export function Dashboard() {
  const { analytics, loading: analyticsLoading } = useAnalytics();
  const { leads, loading: leadsLoading } = useLeads();

  if (analyticsLoading || leadsLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Leads"
          value={analytics?.totalLeads || 0}
          change={analytics?.totalLeads ? `${analytics.conversionRate}% conversion` : undefined}
          changeType="positive"
          icon={Users}
        />
        <StatCard
          title="New Today"
          value={analytics?.newLeadsToday || 0}
          icon={TrendingUp}
          iconBg="gradient-success"
        />
        <StatCard
          title="Hot Leads"
          value={analytics?.hotLeads || 0}
          icon={Flame}
          iconBg="gradient-warning"
        />
        <StatCard
          title="Closed Won"
          value={analytics?.closedWon || 0}
          changeType="positive"
          icon={CheckCircle2}
          iconBg="gradient-success"
        />
        <StatCard
          title="Closed Lost"
          value={analytics?.closedLost || 0}
          icon={XCircle}
          iconBg="bg-destructive"
        />
        <StatCard
          title="Today's Tasks"
          value={(analytics?.pendingFollowUps || 0) + (analytics?.scheduledVisits || 0)}
          change={`${analytics?.pendingFollowUps || 0} follow-ups, ${analytics?.scheduledVisits || 0} visits`}
          icon={Calendar}
          iconBg="gradient-info"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Source */}
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-4">Leads by Source</h3>
          <div className="h-64">
            {analytics?.leadsBySource && analytics.leadsBySource.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.leadsBySource} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="source" type="category" width={100} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No data available yet
              </div>
            )}
          </div>
        </div>

        {/* Leads by Stage */}
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-4">Pipeline Distribution</h3>
          <div className="h-64">
            {analytics?.leadsByStage && analytics.leadsByStage.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.leadsByStage}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="stage"
                  >
                    {analytics.leadsByStage.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No data available yet
              </div>
            )}
          </div>
          {analytics?.leadsByStage && analytics.leadsByStage.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-4 justify-center">
              {analytics.leadsByStage.map((item, index) => (
                <div key={item.stage} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-xs text-muted-foreground">{item.stage}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Leads */}
      <div className="card-elevated p-6">
        <h3 className="font-semibold text-foreground mb-4">Recent Leads</h3>
        {leads.length > 0 ? (
          <div className="space-y-3">
            {leads.slice(0, 5).map((lead) => (
              <div key={lead.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary transition-colors">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground font-semibold text-sm">
                  {lead.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">{lead.property_type} • {lead.budget}</p>
                </div>
                <span className={cn(
                  'text-xs px-2 py-1 rounded-full font-medium',
                  lead.stage === 'new' ? 'bg-info/10 text-info' :
                  lead.stage === 'contacted' ? 'bg-primary/10 text-primary' :
                  lead.stage === 'site-visit' ? 'bg-warning/10 text-warning' :
                  lead.stage === 'negotiation' ? 'bg-success/10 text-success' :
                  'bg-muted text-muted-foreground'
                )}>
                  {lead.stage.replace('-', ' ')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No leads yet. Create your first lead to get started!
          </div>
        )}
      </div>
    </div>
  );
}
