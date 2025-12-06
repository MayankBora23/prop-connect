import { analyticsData } from '@/data/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, Users, Target, Share2 } from 'lucide-react';
import { useAnalytics } from '@/hooks/useData';

const COLORS = ['hsl(230, 80%, 55%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(199, 89%, 48%)', 'hsl(280, 65%, 60%)', 'hsl(340, 75%, 55%)'];

const weeklyData = [
  { day: 'Mon', leads: 12, conversions: 2 },
  { day: 'Tue', leads: 18, conversions: 3 },
  { day: 'Wed', leads: 15, conversions: 4 },
  { day: 'Thu', leads: 22, conversions: 3 },
  { day: 'Fri', leads: 28, conversions: 5 },
  { day: 'Sat', leads: 8, conversions: 1 },
  { day: 'Sun', leads: 5, conversions: 0 },
];

export function AnalyticsView() {
  const { data: analytics = analyticsData, isLoading } = useAnalytics();

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
              <p className="text-3xl font-bold text-foreground mt-1">{analytics.conversionRate}%</p>
              <p className="text-xs text-success mt-2">↑ 2.1% from last month</p>
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
              <p className="text-3xl font-bold text-foreground mt-1">{analytics.totalLeads}</p>
              <p className="text-xs text-success mt-2">↑ 12% from last month</p>
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
              <p className="text-3xl font-bold text-foreground mt-1">{analytics.closedWon}</p>
              <p className="text-xs text-success mt-2">↑ 5 from last month</p>
            </div>
            <div className="w-14 h-14 rounded-xl gradient-success flex items-center justify-center">
              <Target className="w-7 h-7 text-success-foreground" />
            </div>
          </div>
        </div>
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Property Shares</p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {analytics.propertyInterest.reduce((sum, p) => sum + p.shares, 0)}
              </p>
              <p className="text-xs text-success mt-2">↑ 18% from last month</p>
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
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.leadsBySource}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="source"
                  label={({ source, percent }) => `${source} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {analytics.leadsBySource.map((_, index) => (
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
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Performance */}
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-4">Agent Performance</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.agentPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis dataKey="name" type="category" width={100} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="leads" fill="hsl(230, 80%, 55%)" radius={[0, 4, 4, 0]} name="Leads" />
                <Bar dataKey="deals" fill="hsl(142, 76%, 36%)" radius={[0, 4, 4, 0]} name="Deals" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Property Interest */}
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-4">Property Interest</h3>
          <div className="space-y-4">
            {analytics.propertyInterest.map((property, index) => (
              <div key={property.property} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{property.property}</span>
                  <span className="text-muted-foreground">{property.shares} shares • {property.clicks} clicks</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(property.clicks / 250) * 100}%`,
                      backgroundColor: COLORS[index % COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
