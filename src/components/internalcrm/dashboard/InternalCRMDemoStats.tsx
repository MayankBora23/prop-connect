import { AutoAnalyticsCard } from '@/components/automobile/dashboard/AutoAnalyticsCard';
import { Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';

interface InternalCRMDemoStatsProps {
  total: number;
  completed: number;
  cancelled: number;
  upcoming: number;
  conversion: number;
}

export function InternalCRMDemoStats({
  total,
  completed,
  cancelled,
  upcoming,
  conversion,
}: InternalCRMDemoStatsProps) {
  return (
    <div className="card-elevated p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Demo Analytics</h3>
          <p className="text-sm text-muted-foreground">
            {conversion}% demo → closed won conversion
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AutoAnalyticsCard
          title="Total Demos"
          value={total}
          icon={Calendar}
          gradient="bg-gradient-to-br from-violet-500 to-indigo-600"
        />
        <AutoAnalyticsCard
          title="Completed"
          value={completed}
          icon={CheckCircle}
          gradient="bg-gradient-to-br from-emerald-500 to-green-600"
        />
        <AutoAnalyticsCard
          title="Cancelled"
          value={cancelled}
          icon={XCircle}
          gradient="bg-gradient-to-br from-red-500 to-rose-600"
        />
        <AutoAnalyticsCard
          title="Upcoming"
          value={upcoming}
          icon={Clock}
          gradient="bg-gradient-to-br from-amber-500 to-orange-600"
        />
      </div>
    </div>
  );
}
