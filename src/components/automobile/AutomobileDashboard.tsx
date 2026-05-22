import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAutomobileDashboard } from '@/hooks/useAutomobileDashboard';
import { useCurrentProfile } from '@/hooks/useProfiles';
import { AutomobileDashboardHeader } from './dashboard/AutomobileDashboardHeader';
import { DashboardFilters } from './dashboard/DashboardFilters';
import { AutoAnalyticsCard } from './dashboard/AutoAnalyticsCard';
import { DashboardCharts } from './dashboard/DashboardCharts';
import { InventoryInsights } from './dashboard/InventoryInsights';
import { TestDriveStats } from './dashboard/TestDriveStats';
import {
  Car,
  Users,
  Calendar,
  Briefcase,
  TrendingUp,
  DollarSign,
  Wallet,
  Clock,
  Truck,
  Flame,
  Bookmark,
  Package,
  Banknote,
} from 'lucide-react';

export function AutomobileDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: profile } = useCurrentProfile();
  const {
    dateFilter,
    setDateFilter,
    setCustomRange,
    customRange,
    isLoading,
    metrics,
    revenueTrend,
    vehicleSalesByMonth,
    paymentCollection,
    leadFunnel,
    brandInventory,
    categoryDistribution,
    testDriveStats,
    testDriveConversionChart,
    inventoryInsights,
    company,
  } = useAutomobileDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 13 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  const m = metrics;

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      <AutomobileDashboardHeader
        companyName={company?.name}
        userName={profile?.name ?? undefined}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Analytics Overview</h2>
          <p className="text-sm text-muted-foreground">
            Real-time dealership metrics · updates live via WebSocket
          </p>
        </div>
        <DashboardFilters
          dateFilter={dateFilter}
          onFilterChange={setDateFilter}
          customFrom={customRange?.start}
          customTo={customRange?.end}
          onCustomRange={(from, to) => setCustomRange({ start: from, end: to })}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
        <AutoAnalyticsCard title="Total Vehicles" value={m.totalVehicles} icon={Car} gradient="bg-gradient-to-br from-blue-500 to-blue-700" trend={m.trends.vehicles} />
        <AutoAnalyticsCard title="Available Vehicles" value={m.availableVehicles} icon={Package} gradient="bg-gradient-to-br from-cyan-500 to-teal-600" />
        <AutoAnalyticsCard title="Total Leads" value={m.totalLeads} icon={Users} gradient="bg-gradient-to-br from-violet-500 to-purple-600" trend={m.trends.leads} />
        <AutoAnalyticsCard title="New Leads" value={m.newLeads} icon={TrendingUp} gradient="bg-gradient-to-br from-amber-500 to-orange-600" />
        <AutoAnalyticsCard title="Today's Test Drives" value={m.todayTestDrives} icon={Calendar} gradient="bg-gradient-to-br from-orange-500 to-red-500" trend={m.trends.testDrives} />
        <AutoAnalyticsCard title="Completed Deals" value={m.completedDeals} icon={Briefcase} gradient="bg-gradient-to-br from-emerald-500 to-green-700" trend={m.trends.deals} />
        <AutoAnalyticsCard title="Total Payment" value={m.totalPayment} formatValue icon={Banknote} gradient="bg-gradient-to-br from-sky-500 to-blue-600" />
        <AutoAnalyticsCard title="Collected Payment" value={m.collectedPayment} formatValue icon={Wallet} gradient="bg-gradient-to-br from-teal-500 to-emerald-600" />
        <AutoAnalyticsCard title="Remaining Payment" value={m.remainingPayment} formatValue icon={Clock} gradient="bg-gradient-to-br from-amber-500 to-yellow-600" />
        <AutoAnalyticsCard title="Pending Deliveries" value={m.pendingDeliveries} icon={Truck} gradient="bg-gradient-to-br from-indigo-500 to-blue-600" />
        <AutoAnalyticsCard title="Monthly Revenue" value={m.monthlyRevenue} formatValue icon={DollarSign} gradient="bg-gradient-to-br from-green-500 to-emerald-700" />
        <AutoAnalyticsCard title="Hot Leads" value={m.hotLeads} icon={Flame} gradient="bg-gradient-to-br from-red-500 to-orange-600" />
        <AutoAnalyticsCard title="Active Bookings" value={m.activeBookings} icon={Bookmark} gradient="bg-gradient-to-br from-pink-500 to-rose-600" />
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Revenue & Sales Analytics</h2>
        <DashboardCharts
          revenueTrend={revenueTrend}
          vehicleSalesByMonth={vehicleSalesByMonth}
          paymentCollection={paymentCollection}
          leadFunnel={leadFunnel}
          testDriveConversionChart={testDriveConversionChart}
        />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Inventory Analytics</h2>
        <InventoryInsights
          totalValue={inventoryInsights.totalValue}
          fastMoving={inventoryInsights.fastMoving}
          unsold={inventoryInsights.unsold}
          recentlyAdded={inventoryInsights.recentlyAdded}
          lowStock={inventoryInsights.lowStock}
          brandInventory={brandInventory}
          categoryDistribution={categoryDistribution}
        />
      </section>

      <TestDriveStats
        total={testDriveStats.total}
        completed={testDriveStats.completed}
        cancelled={testDriveStats.cancelled}
        upcoming={testDriveStats.upcoming}
        conversion={testDriveStats.conversion}
      />
    </div>
  );
}
