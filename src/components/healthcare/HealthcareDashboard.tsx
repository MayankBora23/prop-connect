import { usePatients } from '@/hooks/usePatients';
import { useAppointments } from '@/hooks/useAppointments';
import { useMedicalRecords } from '@/hooks/useMedicalRecords';
import { usePrescriptions } from '@/hooks/usePrescriptions';
import { useBilling } from '@/hooks/useBilling';
import { StatCard } from '@/components/dashboard/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Calendar, FileText, Pill, CreditCard, TrendingUp } from 'lucide-react';

export function HealthcareDashboard() {
  const { data: patients, isLoading: patientsLoading } = usePatients();
  const { data: appointments, isLoading: appointmentsLoading } = useAppointments();
  const { data: medicalRecords, isLoading: medicalRecordsLoading } = useMedicalRecords();
  const { data: prescriptions, isLoading: prescriptionsLoading } = usePrescriptions();
  const { data: billing, isLoading: billingLoading } = useBilling();

  const isLoading = patientsLoading || appointmentsLoading || medicalRecordsLoading || prescriptionsLoading || billingLoading;

  const totalPatients = patients?.length || 0;
  const totalAppointments = appointments?.length || 0;
  const todayAppointments = appointments?.filter(apt =>
    new Date(apt.appointment_date).toDateString() === new Date().toDateString()
  ).length || 0;
  const totalMedicalRecords = medicalRecords?.length || 0;
  const activePrescriptions = prescriptions?.filter(p => p.status === 'active').length || 0;
  const pendingBills = billing?.filter(b => b.status === 'pending').length || 0;
  const totalRevenue = billing?.filter(b => b.status === 'paid').reduce((sum, bill) => sum + bill.total_amount, 0) || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Message */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome to Healthcare CRM</h1>
        <p className="text-muted-foreground">Manage your patients, appointments, and medical records efficiently.</p>
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
              title="Total Patients"
              value={totalPatients}
              icon={User}
              iconBg="bg-blue-500"
            />
            <StatCard
              title="Total Appointments"
              value={totalAppointments}
              icon={Calendar}
              iconBg="bg-green-500"
            />
            <StatCard
              title="Today's Appointments"
              value={todayAppointments}
              icon={Calendar}
              iconBg="bg-orange-500"
            />
            <StatCard
              title="Medical Records"
              value={totalMedicalRecords}
              icon={FileText}
              iconBg="bg-purple-500"
            />
            <StatCard
              title="Active Prescriptions"
              value={activePrescriptions}
              icon={Pill}
              iconBg="bg-red-500"
            />
            <StatCard
              title="Pending Bills"
              value={pendingBills}
              icon={CreditCard}
              iconBg="bg-yellow-500"
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
              <p className="text-sm text-muted-foreground">From completed bills</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-green-600">
            ${totalRevenue.toFixed(2)}
          </div>
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-100">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Today's Schedule</h3>
              <p className="text-sm text-muted-foreground">Appointments for today</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-600">
            {todayAppointments}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card-elevated p-6">
        <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex flex-col items-center gap-2 p-4 rounded-lg border border-dashed border-border hover:bg-secondary/50 transition-colors">
            <User className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm font-medium">Add Patient</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 rounded-lg border border-dashed border-border hover:bg-secondary/50 transition-colors">
            <Calendar className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm font-medium">Schedule Appointment</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 rounded-lg border border-dashed border-border hover:bg-secondary/50 transition-colors">
            <FileText className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm font-medium">Create Medical Record</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 rounded-lg border border-dashed border-border hover:bg-secondary/50 transition-colors">
            <Pill className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm font-medium">Add Prescription</span>
          </button>
        </div>
      </div>
    </div>
  );
}
