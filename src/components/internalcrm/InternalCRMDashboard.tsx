import { useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useInternalCRMDashboard } from '@/hooks/useInternalCRMDashboard';
import { useCurrentProfile } from '@/hooks/useProfiles';
import { AutoAnalyticsCard } from '@/components/automobile/dashboard/AutoAnalyticsCard';
import { InternalCRMDashboardHeader } from './dashboard/InternalCRMDashboardHeader';
import { InternalCRMDashboardFilters } from './dashboard/InternalCRMDashboardFilters';
import { InternalCRMDashboardCharts } from './dashboard/InternalCRMDashboardCharts';
import { InternalCRMDemoStats } from './dashboard/InternalCRMDemoStats';
import { PlatformInsights } from './dashboard/PlatformInsights';
import {
  Building2,
  Users,
  Calendar,
  TrendingUp,
  DollarSign,
  Headphones,
  CheckCircle,
  XCircle,
  Globe,
  GraduationCap,
  Car,
  Crown,
  Timer,
  Ban,
  Target,
  Presentation,
} from 'lucide-react';

export function InternalCRMDashboard() {
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
    signupsByMonth,
    planDistribution,
    leadFunnel,
    demoConversionChart,
    demoStats,
    platformInsights,
    industryDistribution,
    recentLeads,
    company,
  } = useInternalCRMDashboard();

  const filteredRecentLeads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return recentLeads;
    return recentLeads.filter(
      (l) =>
        l.lead_name.toLowerCase().includes(q) ||
        l.company_name.toLowerCase().includes(q) ||
        (l.phone_no?.toLowerCase().includes(q) ?? false)
    );
  }, [recentLeads, searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
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
      <InternalCRMDashboardHeader
        companyName={company?.name}
        userName={profile?.name ?? undefined}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Platform Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Cross-tenant metrics · clients, leads, demos & support
          </p>
        </div>
        <InternalCRMDashboardFilters
          dateFilter={dateFilter}
          onFilterChange={setDateFilter}
          customFrom={customRange?.start}
          customTo={customRange?.end}
          onCustomRange={(from, to) => setCustomRange({ start: from, end: to })}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
        <AutoAnalyticsCard
          title="Total Clients"
          value={m.totalClients}
          icon={Building2}
          gradient="bg-gradient-to-br from-violet-500 to-indigo-700"
          trend={m.trends.companies}
        />
        <AutoAnalyticsCard
          title="Active Clients"
          value={m.activeClients}
          icon={CheckCircle}
          gradient="bg-gradient-to-br from-emerald-500 to-green-700"
        />
        <AutoAnalyticsCard
          title="Suspended"
          value={m.suspendedClients}
          icon={Ban}
          gradient="bg-gradient-to-br from-red-500 to-rose-600"
        />
        <AutoAnalyticsCard
          title="Premium Plans"
          value={m.premiumClients}
          icon={Crown}
          gradient="bg-gradient-to-br from-amber-500 to-yellow-600"
        />
        <AutoAnalyticsCard
          title="On Trial"
          value={m.trialClients}
          icon={Timer}
          gradient="bg-gradient-to-br from-cyan-500 to-teal-600"
        />
        <AutoAnalyticsCard
          title="Real Estate"
          value={m.realEstateClients}
          icon={Globe}
          gradient="bg-gradient-to-br from-green-500 to-emerald-700"
        />
        <AutoAnalyticsCard
          title="Education"
          value={m.educationClients}
          icon={GraduationCap}
          gradient="bg-gradient-to-br from-purple-500 to-violet-600"
        />
        <AutoAnalyticsCard
          title="Automobile"
          value={m.automobileClients}
          icon={Car}
          gradient="bg-gradient-to-br from-orange-500 to-red-500"
        />
        <AutoAnalyticsCard
          title="Total Leads"
          value={m.totalLeads}
          icon={Users}
          gradient="bg-gradient-to-br from-blue-500 to-blue-700"
          trend={m.trends.leads}
        />
        <AutoAnalyticsCard
          title="New Leads"
          value={m.newLeads}
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-sky-500 to-blue-600"
        />
        <AutoAnalyticsCard
          title="In Pipeline"
          value={m.pipelineLeads}
          icon={Target}
          gradient="bg-gradient-to-br from-indigo-500 to-blue-600"
        />
        <AutoAnalyticsCard
          title="Closed Won"
          value={m.closedWon}
          icon={CheckCircle}
          gradient="bg-gradient-to-br from-teal-500 to-emerald-600"
        />
        <AutoAnalyticsCard
          title="Closed Lost"
          value={m.closedLost}
          icon={XCircle}
          gradient="bg-gradient-to-br from-slate-500 to-slate-700"
        />
        <AutoAnalyticsCard
          title="Today's Demos"
          value={m.todayDemos}
          icon={Calendar}
          gradient="bg-gradient-to-br from-pink-500 to-rose-600"
          trend={m.trends.demos}
        />
        <AutoAnalyticsCard
          title="Open Tickets"
          value={m.openTickets}
          icon={Headphones}
          gradient="bg-gradient-to-br from-fuchsia-500 to-purple-600"
        />
        <AutoAnalyticsCard
          title="Recharge Revenue"
          value={m.rechargeRevenue}
          formatValue
          icon={DollarSign}
          gradient="bg-gradient-to-br from-green-500 to-emerald-700"
        />
        <AutoAnalyticsCard
          title="New Clients"
          value={m.newClientsInRange}
          icon={Presentation}
          gradient="bg-gradient-to-br from-violet-400 to-purple-600"
        />
        <AutoAnalyticsCard
          title="Leads in Period"
          value={m.newLeadsInRange}
          icon={Users}
          gradient="bg-gradient-to-br from-blue-400 to-cyan-600"
        />
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Growth & Pipeline Analytics</h2>
        <InternalCRMDashboardCharts
          revenueTrend={revenueTrend}
          signupsByMonth={signupsByMonth}
          planDistribution={planDistribution}
          leadFunnel={leadFunnel}
          demoConversionChart={demoConversionChart}
        />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Client Platform Insights</h2>
        <PlatformInsights
          industryDistribution={industryDistribution}
          recentClients={platformInsights.recentClients}
          suspended={platformInsights.suspended}
          expiringTrials={platformInsights.expiringTrials}
        />
      </section>

      <InternalCRMDemoStats
        total={demoStats.total}
        completed={demoStats.completed}
        cancelled={demoStats.cancelled}
        upcoming={demoStats.upcoming}
        conversion={demoStats.conversion}
      />

      {filteredRecentLeads.length > 0 && (
        <section className="card-elevated p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Recent Leads</h2>
          <ul className="divide-y divide-border/60">
            {filteredRecentLeads.map((l) => (
              <li key={l.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">{l.lead_name}</p>
                  <p className="text-muted-foreground">
                    {l.company_name} · {l.stage.replace(/_/g, ' ')}
                  </p>
                </div>
                <span className="capitalize text-xs text-muted-foreground">
                  {l.industry.replace(/_/g, ' ')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
