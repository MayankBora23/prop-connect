import {
  Car,
  Users,
  Calendar,
  Briefcase,
  CreditCard,
  FileText,
  Shield,
  Landmark,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  gradient: string;
  onClick?: () => void;
}

interface QuickActionsProps {
  onAddVehicle?: () => void;
  onAddLead?: () => void;
  onScheduleTestDrive?: () => void;
  onCreateBooking?: () => void;
  onAddPayment?: () => void;
  onGenerateInvoice?: () => void;
  onAddInsurance?: () => void;
  onAddFinance?: () => void;
}

export function QuickActions({
  onAddVehicle,
  onAddLead,
  onScheduleTestDrive,
  onCreateBooking,
  onAddPayment,
  onGenerateInvoice,
  onAddInsurance,
  onAddFinance,
}: QuickActionsProps) {
  const actions: QuickAction[] = [
    { id: 'vehicle', label: 'Add Vehicle', icon: Car, gradient: 'from-blue-500 to-cyan-600', onClick: onAddVehicle },
    { id: 'lead', label: 'Add Lead', icon: Users, gradient: 'from-violet-500 to-purple-600', onClick: onAddLead },
    { id: 'test', label: 'Schedule Test Drive', icon: Calendar, gradient: 'from-orange-500 to-amber-600', onClick: onScheduleTestDrive },
    { id: 'booking', label: 'Create Booking', icon: Briefcase, gradient: 'from-emerald-500 to-green-600', onClick: onCreateBooking },
    { id: 'payment', label: 'Add Payment', icon: CreditCard, gradient: 'from-teal-500 to-emerald-600', onClick: onAddPayment },
    { id: 'invoice', label: 'Generate Invoice', icon: FileText, gradient: 'from-indigo-500 to-blue-600', onClick: onGenerateInvoice },
    { id: 'insurance', label: 'Add Insurance', icon: Shield, gradient: 'from-rose-500 to-pink-600', onClick: onAddInsurance },
    { id: 'finance', label: 'Add Finance', icon: Landmark, gradient: 'from-slate-600 to-slate-800', onClick: onAddFinance },
  ];

  return (
    <div className="card-elevated p-6">
      <h3 className="mb-1 text-lg font-semibold text-foreground">Quick Actions</h3>
      <p className="mb-5 text-sm text-muted-foreground">One-click access to common tasks</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              onClick={action.onClick}
              className={cn(
                'group flex flex-col items-center gap-2 rounded-xl border border-border/60 p-4',
                'transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
            >
              <div
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition-transform group-hover:scale-110',
                  action.gradient
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-center text-xs font-medium text-foreground">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
