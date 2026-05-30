import { useState, useMemo } from 'react';
import { useVehicles } from '@/hooks/useVehicles';
import { useAutoLeads } from '@/hooks/useAutoLeads';
import { useTestDrives } from '@/hooks/useTestDrives';
import { useDeals } from '@/hooks/useDeals';
import { useDealPayments } from '@/hooks/useDealPayments';
import { useBookings } from '@/hooks/useBookings';
import { useCurrentCompany } from '@/hooks/useCompany';
import { useCurrentProfile } from '@/hooks/useProfiles';
import { StatCard } from '@/components/dashboard/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Car, Users, Calendar, Briefcase, TrendingUp, DollarSign, 
  CheckCircle, Clock, Flame, ShoppingCart, CreditCard, 
  Package, PieChart, BarChart3, Activity, Gauge, Zap, AlertTriangle, Plus
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, 
  PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, AreaChart, Area 
} from 'recharts';
import { format, startOfToday, startOfWeek, startOfMonth, startOfYear, isWithinInterval } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const COLORS = ['hsl(230, 80%, 55%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(199, 89%, 48%)', 'hsl(280, 65%, 60%)', 'hsl(340, 75%, 55%)'];

export function AutomobileDashboard() {
  const { data: vehicles, isLoading: vehiclesLoading } = useVehicles();
  const { data: leads, isLoading: leadsLoading } = useAutoLeads();
  const { data: testDrives, isLoading: testDrivesLoading } = useTestDrives();
  const { data: deals, isLoading: dealsLoading } = useDeals();
  const { data: dealPayments, isLoading: paymentsLoading } = useDealPayments();
  const { data: bookings, isLoading: bookingsLoading } = useBookings();
  const { data: company } = useCurrentCompany();
  const { data: profile } = useCurrentProfile();

  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('month');

  const isLoading = vehiclesLoading || leadsLoading || testDrivesLoading || dealsLoading || paymentsLoading || bookingsLoading;

  // Get date range based on filter
  const getDateRange = () => {
    const now = new Date();
    switch (timeFilter) {
      case 'today':
        return { start: startOfToday(), end: now };
      case 'week':
        return { start: startOfWeek(now), end: now };
      case 'month':
        return { start: startOfMonth(now), end: now };
      case 'year':
        return { start: startOfYear(now), end: now };
      default:
        return null;
    }
  };

  const dateRange = getDateRange();

  // Filter data based on time range
  const filteredDeals = useMemo(() => {
    if (!dateRange) return deals || [];
    return deals?.filter(deal => 
      isWithinInterval(new Date(deal.created_at), dateRange)
    ) || [];
  }, [deals, dateRange]);

  const filteredLeads = useMemo(() => {
    if (!dateRange) return leads || [];
    return leads?.filter(lead => 
      isWithinInterval(new Date(lead.created_at), dateRange)
    ) || [];
  }, [leads, dateRange]);

  const filteredTestDrives = useMemo(() => {
    if (!dateRange) return testDrives || [];
    return testDrives?.filter(td => 
      isWithinInterval(new Date(td.test_drive_date), dateRange)
    ) || [];
  }, [testDrives, dateRange]);

  // Calculate statistics
  const totalVehicles = vehicles?.length || 0;
  const availableVehicles = vehicles?.filter(v => v.status === 'available').length || 0;
  const totalLeads = leads?.length || 0;
  const newLeads = filteredLeads.filter(l => l.status === 'new').length;
  const hotLeads = filteredLeads.filter(l => l.status === 'hot').length;
  const todayTestDrives = testDrives?.filter(td =>
    new Date(td.test_drive_date).toDateString() === new Date().toDateString()
  ).length || 0;
  // Count qualifying deals (completed/delivered/payment completed/delivery delivered)
  const qualifyingDeals = filteredDeals.filter(d => 
    d.deal_status === 'completed' || 
    d.deal_status === 'delivered' ||
    d.payment_status === 'completed' || 
    d.delivery_status === 'delivered'
  );
  const completedDeals = qualifyingDeals.length;
  const totalDeals = deals?.length || 0;
  const totalPayment = qualifyingDeals.reduce((sum, deal) => sum + (deal.total_on_road_price || 0), 0);
  const collectedPayment = qualifyingDeals.reduce((sum, deal) => sum + (deal.total_paid || 0), 0);
  const remainingPayment = totalPayment - collectedPayment;
  const pendingDeliveries = filteredDeals.filter(d => d.delivery_status === 'pending').length;
  const monthlyRevenue = qualifyingDeals.reduce((sum, deal) => sum + (deal.total_on_road_price || 0), 0);
  const activeBookings = bookings?.filter(b => b.status === 'confirmed').length || 0;

  // Real data for charts - last 6 months
  const getMonthlyData = (monthOffset: number) => {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const monthName = format(targetDate, 'MMM');
    const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
    
    const allDeals = deals || [];
    const monthDeals = allDeals.filter(deal => {
      const isQualifying = 
        deal.deal_status === 'completed' || 
        deal.deal_status === 'delivered' ||
        deal.payment_status === 'completed' || 
        deal.delivery_status === 'delivered';
      const dealDate = new Date(deal.updated_at || deal.created_at);
      const isDateMatch = dealDate >= monthStart && dealDate <= monthEnd;
      return isQualifying && isDateMatch;
    });
    
    return {
      month: monthName,
      revenue: monthDeals.reduce((sum, deal) => sum + (deal.total_on_road_price || 0), 0),
      sales: monthDeals.length,
    };
  };
  
  const revenueTrendData = Array.from({ length: 6 }).map((_, i) => getMonthlyData(5 - i));
  const vehicleSalesData = revenueTrendData.map(d => ({ month: d.month, sales: d.sales }));

  const paymentCollectionData = [
    { name: 'Paid', value: collectedPayment, color: '#22c55e' },
    { name: 'Partial', value: filteredDeals.filter(d => d.payment_status === 'partial').reduce((sum, d) => sum + (d.total_paid || 0), 0), color: '#eab308' },
    { name: 'Pending', value: remainingPayment, color: '#ef4444' },
  ].filter(item => item.value > 0);

  const leadConversionData = [
    { name: 'New Lead', value: filteredLeads.filter(l => l.status === 'new').length },
    { name: 'Follow-up', value: filteredLeads.filter(l => l.status === 'follow_up' || l.status === 'contacted').length },
    { name: 'Test Drive', value: filteredTestDrives.length },
    { name: 'Booking', value: activeBookings },
    { name: 'Delivered', value: completedDeals },
  ];

  // Calculate Inventory Analytics
  const totalInventoryValue = (vehicles || []).reduce((sum: number, v: any) => sum + (v.price || 0), 0) || 0;
  const availableVehiclesList = (vehicles || []).filter((v: any) => v.status === 'available')
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4);
  const recentlyAddedVehicles = (vehicles || [])
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4);
  const brandCounts = (vehicles || []).reduce((acc: Record<string, number>, v: any) => {
    acc[v.brand] = (acc[v.brand] || 0) + 1;
    return acc;
  }, {});
  const lowStockBrands = Object.entries(brandCounts)
    .filter(([_, count]) => (count as number) <= 2)
    .map(([brand]) => brand);

  // Vehicle category distribution
  const vehicleCategories = (vehicles || []).reduce((acc: Record<string, number>, vehicle: any) => {
    const category = vehicle.vehicle_type || 'Unknown';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const categoryDistributionData = Object.entries(vehicleCategories)
    .map(([category, count]) => ({ 
      category: category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), 
      count 
    }))
    .sort((a, b) => (b.count as number) - (a.count as number));

  // Test Drive vs Booking Conversion
  const testDriveAnalytics = {
    total: testDrives?.length || 0,
    completed: testDrives?.filter(td => td.status === 'completed').length || 0,
    cancelled: testDrives?.filter(td => td.status === 'cancelled').length || 0,
    upcoming: testDrives?.filter(td => td.status === 'scheduled').length || 0,
  };

  const testDriveBookingData = [
    { name: 'Test Drives', value: testDrives?.length || 0, color: '#3b82f6' },
    { name: 'Bookings', value: bookings?.length || 0, color: '#10b981' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

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
                Welcome back, {profile?.name || 'User'}!
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{company?.name || 'Your Dealership'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{currentDate}</p>
            </div>
          </div>
          <Select value={timeFilter} onValueChange={(val: any) => setTimeFilter(val)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 12 Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Vehicles"
          value={totalVehicles}
          icon={Car}
          iconBg="gradient-primary"
          change="Total inventory"
          changeType="neutral"
        />
        <StatCard
          title="Available Vehicles"
          value={availableVehicles}
          icon={Car}
          iconBg="gradient-success"
          change="Ready for sale"
          changeType="positive"
        />
        <StatCard
          title="Total Leads"
          value={totalLeads}
          icon={Users}
          iconBg="gradient-info"
          change="All potential customers"
          changeType="neutral"
        />
        <StatCard
          title="New Leads"
          value={newLeads}
          icon={TrendingUp}
          iconBg="gradient-warning"
          change="In this period"
          changeType={newLeads > 0 ? "positive" : "neutral"}
        />
        <StatCard
          title="Today's Test Drives"
          value={todayTestDrives}
          icon={Calendar}
          iconBg="bg-purple-500"
          change="Scheduled for today"
          changeType="neutral"
        />
        <StatCard
          title="Completed Deals"
          value={completedDeals}
          icon={CheckCircle}
          iconBg="gradient-success"
          change="Successfully closed"
          changeType="positive"
        />
        <StatCard
          title="Total Payment"
          value={`₹${totalPayment.toLocaleString()}`}
          icon={DollarSign}
          iconBg="gradient-primary"
          change="Total receivable"
          changeType="neutral"
        />
        <StatCard
          title="Collected Payment"
          value={`₹${collectedPayment.toLocaleString()}`}
          icon={CreditCard}
          iconBg="gradient-success"
          change="Received amount"
          changeType="positive"
        />
        <StatCard
          title="Remaining Payment"
          value={`₹${remainingPayment.toLocaleString()}`}
          icon={Clock}
          iconBg={remainingPayment > 0 ? "gradient-warning" : "gradient-success"}
          change="Outstanding dues"
          changeType={remainingPayment > 0 ? "negative" : "positive"}
        />
        <StatCard
          title="Pending Deliveries"
          value={pendingDeliveries}
          icon={Package}
          iconBg="gradient-warning"
          change="Vehicles to deliver"
          changeType="neutral"
        />
        <StatCard
          title="Monthly Revenue"
          value={`₹${monthlyRevenue.toLocaleString()}`}
          icon={TrendingUp}
          iconBg="gradient-success"
          change="Revenue this period"
          changeType="positive"
        />
        <StatCard
          title="Hot Leads"
          value={hotLeads}
          icon={Flame}
          iconBg="gradient-warning"
          change="High priority"
          changeType="positive"
        />
        <StatCard
          title="Active Bookings"
          value={activeBookings}
          icon={ShoppingCart}
          iconBg="gradient-info"
          change="Confirmed bookings"
          changeType="positive"
        />
      </div>

      {/* Revenue & Sales Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Revenue Trend</h3>
              <p className="text-sm text-muted-foreground">Monthly revenue growth</p>
            </div>
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrendData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(230, 80%, 55%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(230, 80%, 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `₹${value/1000}k`} />
                <Tooltip 
                  formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(230, 80%, 55%)" 
                  fill="url(#revenueGradient)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vehicle Sales Chart */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Vehicle Sales</h3>
              <p className="text-sm text-muted-foreground">Vehicles sold per month</p>
            </div>
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vehicleSalesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip 
                  formatter={(value: number) => [value, 'Vehicles']}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                />
                <Bar dataKey="sales" fill="hsl(230, 80%, 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Collection Chart */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Payment Collection</h3>
              <p className="text-sm text-muted-foreground">Payment status distribution</p>
            </div>
            <PieChart className="w-5 h-5 text-warning" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={paymentCollectionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {paymentCollectionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Amount']}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Category Distribution</h3>
              <p className="text-sm text-muted-foreground">By vehicle type</p>
            </div>
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div className="h-64">
            {categoryDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={categoryDistributionData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="category"
                    label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {categoryDistributionData.map((_, index) => (
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
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inventory Analytics */}
      <div className="space-y-6">
        <h3 className="font-semibold text-foreground">Inventory Analytics</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Inventory Value */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-800 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-3">Total Inventory Value</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">₹{(totalInventoryValue / 10000000).toFixed(2)} Cr</p>
          </div>

          {/* Fast-moving */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <h4 className="text-sm font-medium text-foreground">Fast-moving</h4>
            </div>
            <div className="text-sm text-muted-foreground">
              {availableVehiclesList.length === 0 ? 'No data' : `${availableVehiclesList.length} vehicles`}
            </div>
          </div>

          {/* Unsold (Available) */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Car className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <h4 className="text-sm font-medium text-foreground">Unsold (available)</h4>
            </div>
            {availableVehiclesList.length > 0 ? (
              <div className="space-y-2">
                {availableVehiclesList.map((v: any) => (
                  <div key={v.id} className="flex justify-between text-sm">
                    <span className="text-foreground">
                      {v.brand?.charAt(0).toUpperCase() + v.brand?.slice(1) || ''} {v.model?.charAt(0).toUpperCase() + v.model?.slice(1) || ''}
                    </span>
                    <span className="text-muted-foreground">₹{(v.price / 100000).toFixed(1)}L</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No available vehicles</div>
            )}
          </div>

          {/* Recently Added */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Car className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <h4 className="text-sm font-medium text-foreground">Recently added</h4>
            </div>
            {recentlyAddedVehicles.length > 0 ? (
              <div className="space-y-2">
                {recentlyAddedVehicles.map((v: any) => (
                  <div key={v.id} className="flex justify-between text-sm">
                    <span className="text-foreground">
                      {v.brand?.charAt(0).toUpperCase() + v.brand?.slice(1) || ''} {v.model?.charAt(0).toUpperCase() + v.model?.slice(1) || ''}
                    </span>
                    <span className="text-muted-foreground">₹{(v.price / 100000).toFixed(1)}L</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No recently added vehicles</div>
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockBrands.length > 0 && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-orange-900 dark:text-orange-100">Low stock alert</h4>
                <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                  {lowStockBrands.map(brand => brand?.charAt(0).toUpperCase() + brand?.slice(1)).join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Test Drive vs Booking & Lead Conversion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Drive vs Booking Conversion */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Test Drive vs Booking</h3>
              <p className="text-sm text-muted-foreground">Conversion overview</p>
            </div>
            <Activity className="w-5 h-5 text-info" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={testDriveBookingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {testDriveBookingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Conversion Funnel */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Lead Conversion</h3>
              <p className="text-sm text-muted-foreground">Funnel from lead to delivery</p>
            </div>
            <Activity className="w-5 h-5 text-info" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadConversionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                />
                <Bar dataKey="value" fill="hsl(230, 80%, 55%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Test Drive Analytics - Full Width */}
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-foreground">Test Drive Analytics</h3>
            <p className="text-sm text-muted-foreground">Test drive statistics</p>
          </div>
          <Calendar className="w-5 h-5 text-warning" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-blue-500/10">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold text-blue-600">{testDriveAnalytics.total}</p>
          </div>
          <div className="p-4 rounded-lg bg-green-500/10">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-green-600">{testDriveAnalytics.completed}</p>
          </div>
          <div className="p-4 rounded-lg bg-red-500/10">
            <p className="text-sm text-muted-foreground">Cancelled</p>
            <p className="text-2xl font-bold text-red-600">{testDriveAnalytics.cancelled}</p>
          </div>
          <div className="p-4 rounded-lg bg-yellow-500/10">
            <p className="text-sm text-muted-foreground">Upcoming</p>
            <p className="text-2xl font-bold text-yellow-600">{testDriveAnalytics.upcoming}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
