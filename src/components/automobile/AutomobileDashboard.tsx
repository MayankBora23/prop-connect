import { useVehicles } from '@/hooks/useVehicles';
import { useAutoLeads } from '@/hooks/useAutoLeads';
import { useTestDrives } from '@/hooks/useTestDrives';
import { useDeals } from '@/hooks/useDeals';
import { StatCard } from '@/components/dashboard/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Car, Users, Calendar, Briefcase, TrendingUp, DollarSign } from 'lucide-react';

export function AutomobileDashboard() {
  const { data: vehicles, isLoading: vehiclesLoading } = useVehicles();
  const { data: leads, isLoading: leadsLoading } = useAutoLeads();
  const { data: testDrives, isLoading: testDrivesLoading } = useTestDrives();
  const { data: deals, isLoading: dealsLoading } = useDeals();

  const isLoading = vehiclesLoading || leadsLoading || testDrivesLoading || dealsLoading;

  const totalVehicles = vehicles?.length || 0;
  const availableVehicles = vehicles?.filter(v => v.status === 'available').length || 0;
  const totalLeads = leads?.length || 0;
  const newLeads = leads?.filter(l => l.status === 'new').length || 0;
  const todayTestDrives = testDrives?.filter(td =>
    new Date(td.test_drive_date).toDateString() === new Date().toDateString()
  ).length || 0;
  const totalDeals = deals?.length || 0;
  const completedDeals = deals?.filter(d => d.status === 'completed').length || 0;
  const totalRevenue = deals?.filter(d => d.status === 'completed').reduce((sum, deal) => sum + deal.final_price, 0) || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Message */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome to Automobile CRM</h1>
        <p className="text-muted-foreground">Manage your vehicle inventory, leads, and sales efficiently.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))
        ) : (
          <>
            <StatCard
              title="Total Vehicles"
              value={totalVehicles}
              icon={Car}
              iconBg="bg-blue-500"
            />
            <StatCard
              title="Available Vehicles"
              value={availableVehicles}
              icon={Car}
              iconBg="bg-green-500"
            />
            <StatCard
              title="Total Leads"
              value={totalLeads}
              icon={Users}
              iconBg="bg-orange-500"
            />
            <StatCard
              title="New Leads"
              value={newLeads}
              icon={Users}
              iconBg="bg-yellow-500"
            />
            <StatCard
              title="Today's Test Drives"
              value={todayTestDrives}
              icon={Calendar}
              iconBg="bg-purple-500"
            />
            <StatCard
              title="Completed Deals"
              value={completedDeals}
              icon={Briefcase}
              iconBg="bg-red-500"
            />
          </>
        )}
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-green-100">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Total Revenue</h3>
              <p className="text-sm text-muted-foreground">From completed deals</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-green-600">
            ₹{totalRevenue.toLocaleString()}
          </div>
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-100">
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Deal Pipeline</h3>
              <p className="text-sm text-muted-foreground">Active deals in progress</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-600">
            {totalDeals - completedDeals}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card-elevated p-6">
        <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex flex-col items-center gap-2 p-4 rounded-lg border border-dashed border-border hover:bg-secondary/50 transition-colors">
            <Car className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm font-medium">Add Vehicle</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 rounded-lg border border-dashed border-border hover:bg-secondary/50 transition-colors">
            <Users className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm font-medium">Add Lead</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 rounded-lg border border-dashed border-border hover:bg-secondary/50 transition-colors">
            <Calendar className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm font-medium">Schedule Test Drive</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 rounded-lg border border-dashed border-border hover:bg-secondary/50 transition-colors">
            <Briefcase className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm font-medium">Create Booking</span>
          </button>
        </div>
      </div>
    </div>
  );
}
