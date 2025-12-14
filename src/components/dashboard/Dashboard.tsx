import { Users, TrendingUp, Calendar, CheckCircle2, XCircle, Flame } from 'lucide-react';
import { StatCard } from './StatCard';
import { useLeads } from '@/hooks/useLeads';
import { useFollowUps } from '@/hooks/useFollowUps';
import { useSiteVisits } from '@/hooks/useSiteVisits';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

const COLORS = ['hsl(230, 80%, 55%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(199, 89%, 48%)', 'hsl(280, 65%, 60%)', 'hsl(340, 75%, 55%)'];

export function Dashboard() {
  const { data: leads, isLoading: leadsLoading } = useLeads();
  const { data: followUps, isLoading: followUpsLoading } = useFollowUps();
  const { data: siteVisits, isLoading: visitsLoading } = useSiteVisits();

  const isLoading = leadsLoading || followUpsLoading || visitsLoading;

  // Calculate stats from real data
  const totalLeads = leads?.length || 0;
  const newLeadsToday = leads?.filter(l => 
    format(new Date(l.created_at), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  ).length || 0;
  const hotLeads = leads?.filter(l => l.tags?.includes('Hot Lead')).length || 0;
  const closedWon = leads?.filter(l => l.stage === 'closed-won').length || 0;
  const closedLost = leads?.filter(l => l.stage === 'closed-lost').length || 0;
  const conversionRate = totalLeads > 0 ? Math.round((closedWon / totalLeads) * 100) : 0;
  
  const pendingFollowUps = followUps?.filter(f => f.status === 'pending').length || 0;
  const scheduledVisits = siteVisits?.filter(v => v.status === 'scheduled').length || 0;

  // Calculate leads by source
  const leadsBySource = leads?.reduce((acc, lead) => {
    const source = lead.source || 'Unknown';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const leadsBySourceData = Object.entries(leadsBySource)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  // Calculate leads by stage
  const leadsByStage = leads?.reduce((acc, lead) => {
    acc[lead.stage] = (acc[lead.stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const leadsByStageData = Object.entries(leadsByStage)
    .map(([stage, count]) => ({ stage: stage.replace('-', ' '), count }));

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 w-full rounded-lg" />
          <Skeleton className="h-80 w-full rounded-lg" />
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
          value={totalLeads}
          change="From database"
          changeType="neutral"
          icon={Users}
        />
        <StatCard
          title="New Today"
          value={newLeadsToday}
          icon={TrendingUp}
          iconBg="gradient-success"
        />
        <StatCard
          title="Hot Leads"
          value={hotLeads}
          icon={Flame}
          iconBg="gradient-warning"
        />
        <StatCard
          title="Closed Won"
          value={closedWon}
          change={`${conversionRate}% conversion`}
          changeType="positive"
          icon={CheckCircle2}
          iconBg="gradient-success"
        />
        <StatCard
          title="Closed Lost"
          value={closedLost}
          icon={XCircle}
          iconBg="bg-destructive"
        />
        <StatCard
          title="Today's Tasks"
          value={pendingFollowUps + scheduledVisits}
          change={`${pendingFollowUps} follow-ups, ${scheduledVisits} visits`}
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
            {leadsBySourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadsBySourceData} layout="vertical">
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
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Leads by Stage */}
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-4">Pipeline Distribution</h3>
          <div className="h-64">
            {leadsByStageData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leadsByStageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="stage"
                  >
                    {leadsByStageData.map((_, index) => (
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
                No data available
              </div>
            )}
          </div>
          {leadsByStageData.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-4 justify-center">
              {leadsByStageData.map((item, index) => (
                <div key={item.stage} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-xs text-muted-foreground capitalize">{item.stage}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Leads */}
      <div className="card-elevated p-6">
        <h3 className="font-semibold text-foreground mb-4">Recent Leads</h3>
        {leads && leads.length > 0 ? (
          <div className="space-y-3">
            {leads.slice(0, 5).map((lead) => (
              <div key={lead.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary transition-colors">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground font-semibold text-sm">
                  {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">{lead.property_type || 'Unknown'} • {lead.budget || 'No budget'}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  lead.stage === 'new' ? 'bg-info/10 text-info' :
                  lead.stage === 'contacted' ? 'bg-primary/10 text-primary' :
                  lead.stage === 'site-visit' ? 'bg-warning/10 text-warning' :
                  lead.stage === 'negotiation' ? 'bg-success/10 text-success' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {lead.stage.replace('-', ' ')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No leads yet. Add your first lead to get started.
          </div>
        )}
      </div>
    </div>
  );
}
