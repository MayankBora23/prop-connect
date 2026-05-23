import { useVehicles } from '@/hooks/useVehicles';
import { useAutoLeads } from '@/hooks/useAutoLeads';
import { useTestDrives } from '@/hooks/useTestDrives';
import { useDeals } from '@/hooks/useDeals';
import { useCurrentCompany } from '@/hooks/useCompany';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line } from 'recharts';
import { TrendingUp, Car, Users, Gauge, DollarSign, CheckCircle, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

const COLORS = ['hsl(230, 80%, 55%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(199, 89%, 48%)', 'hsl(280, 65%, 60%)', 'hsl(340, 75%, 55%)'];

export function AutomobileAnalytics() {
  const { data: vehicles, isLoading: vehiclesLoading } = useVehicles();
  const { data: leads, isLoading: leadsLoading } = useAutoLeads();
  const { data: testDrives, isLoading: testDrivesLoading } = useTestDrives();
  const { data: deals, isLoading: dealsLoading } = useDeals();
  const { data: company } = useCurrentCompany();

  const isLoading = vehiclesLoading || leadsLoading || testDrivesLoading || dealsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Calculate automobile-specific stats
  const totalLeads = leads?.length || 0;
  const allDeals = (deals || []);
  
  // Count deals that are either:
  // - deal_status is completed/delivered, OR
  // - payment_status is completed, OR
  // - delivery_status is delivered
  const completedDeals = allDeals.filter((d: any) => {
    return (
      d.deal_status === 'completed' || 
      d.deal_status === 'delivered' ||
      d.payment_status === 'completed' || 
      d.delivery_status === 'delivered'
    );
  }).length || 0;
  
  const conversionRate = totalLeads > 0 ? Math.round((completedDeals / totalLeads) * 100) : 0;
  const completedTestDrives = testDrives?.filter((td: any) => td.status === 'completed').length || 0;
  const totalVehicles = vehicles?.length || 0;
  const availableVehicles = (vehicles || []).filter((v: any) => v.status === 'available').length || 0;

  // Calculate financial metrics - use same criteria for revenue/collected
  const qualifyingDeals = allDeals.filter((d: any) => 
    d.deal_status === 'completed' || 
    d.deal_status === 'delivered' ||
    d.payment_status === 'completed' || 
    d.delivery_status === 'delivered'
  );
  
  const totalRevenue = qualifyingDeals.reduce((sum: number, deal: any) => sum + (deal.total_on_road_price || 0), 0) || 0;
  const totalCollected = qualifyingDeals.reduce((sum: number, deal: any) => sum + (deal.total_paid || 0), 0) || 0;
  const totalPending = totalRevenue - totalCollected;

  // Leads by source
  const leadsBySource = (leads || []).reduce((acc: Record<string, number>, lead: any) => {
    const source = lead.source || 'Unknown';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const leadsBySourceData = Object.entries(leadsBySource)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => (b.count as number) - (a.count as number));

  // Leads by stage
  const leadsByStage = (leads || []).reduce((acc: Record<string, number>, lead: any) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const leadsByStageData = Object.entries(leadsByStage)
    .map(([stage, count]) => ({ stage: stage.replace('-', ' '), count: count as number }));

  // Weekly data (last 7 days)
  const weeklyData = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayLeads = (leads || []).filter((l: any) =>
      format(new Date(l.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    ).length || 0;
    const dayDeals = allDeals.filter((d: any) => {
      const isQualifying = 
        d.deal_status === 'completed' || 
        d.deal_status === 'delivered' ||
        d.payment_status === 'completed' || 
        d.delivery_status === 'delivered';
      const isDateMatch = 
        format(new Date(d.updated_at || d.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
      return isQualifying && isDateMatch;
    }).length || 0;

    return {
      day: format(date, 'EEE'),
      leads: dayLeads,
      deals: dayDeals,
    };
  });

  // Vehicle brands
  const brands = (vehicles || []).reduce((acc: Record<string, number>, vehicle: any) => {
    acc[vehicle.brand] = (acc[vehicle.brand] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const brandWiseData = Object.entries(brands)
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => (b.count as number) - (a.count as number))
    .slice(0, 5);

  // Deals per Month (last 12 months)
  const dealsPerMonth = Array.from({ length: 6 }).map((_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);

    const monthDeals = allDeals.filter((deal: any) => {
      const isQualifying = 
        deal.deal_status === 'completed' || 
        deal.deal_status === 'delivered' ||
        deal.payment_status === 'completed' || 
        deal.delivery_status === 'delivered';
      const dealDate = new Date(deal.updated_at || deal.created_at);
      const isDateMatch = dealDate >= monthStart && dealDate <= monthEnd;
      return isQualifying && isDateMatch;
    }).length || 0;

    const monthRevenue = allDeals.filter((deal: any) => {
      const isQualifying = 
        deal.deal_status === 'completed' || 
        deal.deal_status === 'delivered' ||
        deal.payment_status === 'completed' || 
        deal.delivery_status === 'delivered';
      const dealDate = new Date(deal.updated_at || deal.created_at);
      const isDateMatch = dealDate >= monthStart && dealDate <= monthEnd;
      return isQualifying && isDateMatch;
    }).reduce((sum: number, deal: any) => sum + (deal.total_on_road_price || 0), 0) || 0;

    return {
      month: format(date, 'MMM yyyy'),
      deals: monthDeals,
      revenue: monthRevenue,
    };
  });

  const currentDate = format(new Date(), 'EEEE, MMMM d, yyyy');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Beautiful Banner */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-6 md:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shrink-0 shadow-lg">
              <Gauge className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                Automobile Analytics
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{company?.name || 'Your Dealership'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{currentDate}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
              <p className="text-3xl font-bold text-foreground mt-1">{conversionRate}%</p>
              <p className="text-xs text-muted-foreground mt-2">{completedDeals} of {totalLeads} leads</p>
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
              <p className="text-xs text-muted-foreground mt-2">Potential customers</p>
            </div>
            <div className="w-14 h-14 rounded-xl gradient-info flex items-center justify-center">
              <Users className="w-7 h-7 text-info-foreground" />
            </div>
          </div>
        </div>
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Deals Completed</p>
              <p className="text-3xl font-bold text-foreground mt-1">{completedDeals}</p>
              <p className="text-xs text-muted-foreground mt-2">Vehicles sold</p>
            </div>
            <div className="w-14 h-14 rounded-xl gradient-success flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-success-foreground" />
            </div>
          </div>
        </div>
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Test Drives</p>
              <p className="text-3xl font-bold text-foreground mt-1">{completedTestDrives}</p>
              <p className="text-xs text-muted-foreground mt-2">Completed test drives</p>
            </div>
            <div className="w-14 h-14 rounded-xl gradient-warning flex items-center justify-center">
              <Calendar className="w-7 h-7 text-warning-foreground" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Leads & Deals */}
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-4">Weekly Leads & Deals</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(230, 80%, 55%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(230, 80%, 55%)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDeals" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="leads" stroke="hsl(230, 80%, 55%)" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={2} name="New Leads" />
                <Area type="monotone" dataKey="deals" stroke="hsl(142, 76%, 36%)" fillOpacity={1} fill="url(#colorDeals)" strokeWidth={2} name="Deals Closed" />
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
        {/* Lead Pipeline Distribution */}
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-4">Lead Pipeline</h3>
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

        {/* Brand-wise Inventory */}
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-4">Brand-wise Inventory</h3>
          {brandWiseData.length > 0 ? (
            <div className="space-y-4">
              {brandWiseData.map((brand, index) => (
                <div key={brand.brand} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{brand.brand}</span>
                    <span className="text-muted-foreground">{brand.count as number} vehicles</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${brandWiseData.length > 0 ? Math.min(((brand.count as number) / (brandWiseData[0].count as number)) * 100, 100) : 0}%`,
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No inventory data available
            </div>
          )}
        </div>
      </div>

      {/* Monthly Deals & Revenue */}
      <div className="grid grid-cols-1 gap-6">
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-4">Monthly Deals & Revenue</h3>
          <div className="h-72">
            {dealsPerMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dealsPerMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis yAxisId="left" stroke="hsl(230, 80%, 55%)" fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" stroke="hsl(142, 76%, 36%)" fontSize={12} tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value, name) => [
                      name === 'revenue' ? `₹${Number(value).toLocaleString()}` : value,
                      name === 'revenue' ? 'Revenue' : 'Deals Closed'
                    ]}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="deals"
                    name="Deals Closed"
                    stroke="hsl(230, 80%, 55%)"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(230, 80%, 55%)', strokeWidth: 2, r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="hsl(142, 76%, 36%)"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(142, 76%, 36%)', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No deal data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Vehicles</p>
              <p className="text-2xl font-bold text-foreground mt-1">{totalVehicles}</p>
              <p className="text-xs text-muted-foreground mt-2">Inventory count</p>
            </div>
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <Car className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
        </div>
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Available</p>
              <p className="text-2xl font-bold text-foreground mt-1">{availableVehicles}</p>
              <p className="text-xs text-muted-foreground mt-2">Ready for sale</p>
            </div>
            <div className="w-12 h-12 rounded-xl gradient-success flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-success-foreground" />
            </div>
          </div>
        </div>
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold text-foreground mt-1">₹{totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-2">From completed deals</p>
            </div>
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
        </div>
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Payment</p>
              <p className="text-2xl font-bold text-foreground mt-1">₹{totalPending.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-2">Outstanding dues</p>
            </div>
            <div className="w-12 h-12 rounded-xl gradient-warning flex items-center justify-center">
              <Gauge className="w-6 h-6 text-warning-foreground" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
