import { useLeads } from '@/hooks/useLeads';
import { useProperties } from '@/hooks/useProperties';
import { useSiteVisits } from '@/hooks/useSiteVisits';
import { useFollowUps } from '@/hooks/useFollowUps';
import { useProfiles } from '@/hooks/useProfiles';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, Users, Target, Share2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays, isAfter } from 'date-fns';

const COLORS = ['hsl(230, 80%, 55%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(199, 89%, 48%)', 'hsl(280, 65%, 60%)', 'hsl(340, 75%, 55%)'];

export function AnalyticsView() {
  const { data: leads, isLoading: leadsLoading } = useLeads();
  const { data: properties, isLoading: propertiesLoading } = useProperties();
  const { data: siteVisits, isLoading: visitsLoading } = useSiteVisits();
  const { data: profiles, isLoading: profilesLoading } = useProfiles();

  const isLoading = leadsLoading || propertiesLoading || visitsLoading || profilesLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 w-full rounded-lg" />
          <Skeleton className="h-80 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  // Calculate real stats
  const totalLeads = leads?.length || 0;
  const closedWon = leads?.filter(l => l.stage === 'closed-won').length || 0;
  const conversionRate = totalLeads > 0 ? Math.round((closedWon / totalLeads) * 100) : 0;
  const completedVisits = siteVisits?.filter(v => v.status === 'completed').length || 0;

  // Leads by source
  const leadsBySource = leads?.reduce((acc, lead) => {
    const source = lead.source || 'Unknown';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const leadsBySourceData = Object.entries(leadsBySource)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  // Leads by stage
  const leadsByStage = leads?.reduce((acc, lead) => {
    acc[lead.stage] = (acc[lead.stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const leadsByStageData = Object.entries(leadsByStage)
    .map(([stage, count]) => ({ stage: stage.replace('-', ' '), count }));

  // Weekly data (last 7 days)
  const weeklyData = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayLeads = leads?.filter(l => 
      format(new Date(l.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    ).length || 0;
    const dayConversions = leads?.filter(l => 
      l.stage === 'closed-won' && 
      format(new Date(l.updated_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    ).length || 0;
    
    return {
      day: format(date, 'EEE'),
      leads: dayLeads,
      conversions: dayConversions,
    };
  });

  // Property interest (simplified - just show available properties)
  const propertyInterest = (properties || [])
    .filter(p => p.status === 'available')
    .slice(0, 5)
    .map(p => ({
      property: p.title,
      visits: siteVisits?.filter(v => v.property_id === p.id).length || 0,
    }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
              <p className="text-3xl font-bold text-foreground mt-1">{conversionRate}%</p>
              <p className="text-xs text-muted-foreground mt-2">{closedWon} of {totalLeads} leads</p>
            </div>
            <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>
        </div>
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Leads</p>
              <p className="text-3xl font-bold text-foreground mt-1">{totalLeads}</p>
              <p className="text-xs text-muted-foreground mt-2">From database</p>
            </div>
            <div className="w-14 h-14 rounded-xl gradient-info flex items-center justify-center">
              <Users className="w-7 h-7 text-info-foreground" />
            </div>
          </div>
        </div>
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Deals Closed</p>
              <p className="text-3xl font-bold text-foreground mt-1">{closedWon}</p>
              <p className="text-xs text-muted-foreground mt-2">Closed-won leads</p>
            </div>
            <div className="w-14 h-14 rounded-xl gradient-success flex items-center justify-center">
              <Target className="w-7 h-7 text-success-foreground" />
            </div>
          </div>
        </div>
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Site Visits</p>
              <p className="text-3xl font-bold text-foreground mt-1">{completedVisits}</p>
              <p className="text-xs text-muted-foreground mt-2">Completed visits</p>
            </div>
            <div className="w-14 h-14 rounded-xl gradient-warning flex items-center justify-center">
              <Share2 className="w-7 h-7 text-warning-foreground" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Leads Trend */}
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-4">Weekly Leads & Conversions</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(230, 80%, 55%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(230, 80%, 55%)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area type="monotone" dataKey="leads" stroke="hsl(230, 80%, 55%)" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={2} />
                <Area type="monotone" dataKey="conversions" stroke="hsl(142, 76%, 36%)" fillOpacity={1} fill="url(#colorConversions)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Leads by Source */}
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-4">Leads by Source</h3>
          <div className="h-72">
            {leadsBySourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leadsBySourceData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="source"
                    label={({ source, percent }) => `${source} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {leadsBySourceData.map((_, index) => (
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
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Distribution */}
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-4">Pipeline Distribution</h3>
          <div className="h-72">
            {leadsByStageData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadsByStageData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="stage" type="category" width={100} stroke="hsl(var(--muted-foreground))" fontSize={12} />
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

        {/* Property Interest */}
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-4">Property Interest</h3>
          {propertyInterest.length > 0 ? (
            <div className="space-y-4">
              {propertyInterest.map((property, index) => (
                <div key={property.property} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{property.property}</span>
                    <span className="text-muted-foreground">{property.visits} visits</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min((property.visits / 10) * 100, 100)}%`,
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No properties available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
