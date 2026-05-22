import { formatDistanceToNow } from 'date-fns';
import {
  UserPlus,
  CreditCard,
  Car,
  Calendar,
  Truck,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: string;
  message: string;
  time: string;
}

const typeConfig: Record<string, { icon: typeof Activity; color: string }> = {
  lead: { icon: UserPlus, color: 'bg-blue-500' },
  auto_lead_updated: { icon: UserPlus, color: 'bg-blue-500' },
  booking: { icon: Car, color: 'bg-emerald-500' },
  test_drive: { icon: Calendar, color: 'bg-orange-500' },
  payment: { icon: CreditCard, color: 'bg-violet-500' },
  delivery: { icon: Truck, color: 'bg-green-600' },
};

interface RecentActivitiesProps {
  activities: ActivityItem[];
}

export function RecentActivities({ activities }: RecentActivitiesProps) {
  return (
    <div className="card-elevated p-6">
      <h3 className="mb-1 text-lg font-semibold text-foreground">Recent Activities</h3>
      <p className="mb-6 text-sm text-muted-foreground">Live timeline of dealership events</p>
      <div className="relative space-y-0">
        <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />
        {activities.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No recent activity</p>
        ) : (
          activities.map((item) => {
            const cfg = typeConfig[item.type] ?? { icon: Activity, color: 'bg-slate-500' };
            const Icon = cfg.icon;
            return (
              <div key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
                <div
                  className={cn(
                    'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white',
                    cfg.color
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <p className="text-sm text-foreground">{item.message}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.time), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
