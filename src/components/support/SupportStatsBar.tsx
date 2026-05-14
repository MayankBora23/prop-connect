import { Bell, CheckCircle, Clock, Ticket as TicketIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTicketStats } from '@/hooks/useSupport';
import { useCurrentProfile } from '@/hooks/useProfiles';
import { useIndustry } from '@/hooks/useIndustry';

export function SupportStatsBar() {
  const { data: stats, isLoading } = useTicketStats();
  const { data: profile } = useCurrentProfile();
  const { data: industry } = useIndustry();

  const s = stats ?? {
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
    total: 0,
    unread_by_admin: 0,
  };

  const showUnreadCard =
    profile?.role === 'super_admin' ||
    profile?.role === 'admin' ||
    industry === 'internal_crm';

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`grid gap-3 mb-6 ${showUnreadCard ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'}`}
    >
      <Card className="border-blue-200 bg-blue-50/60">
        <CardContent className="pt-4 pb-4 flex items-center gap-3">
          <TicketIcon className="h-8 w-8 text-blue-600 shrink-0" />
          <div>
            <p className="text-xs font-medium text-blue-800">Open</p>
            <p className="text-2xl font-bold text-blue-900">{s.open}</p>
          </div>
        </CardContent>
      </Card>
      <Card className="border-amber-200 bg-amber-50/60">
        <CardContent className="pt-4 pb-4 flex items-center gap-3">
          <Clock className="h-8 w-8 text-amber-600 shrink-0" />
          <div>
            <p className="text-xs font-medium text-amber-800">In Progress</p>
            <p className="text-2xl font-bold text-amber-900">{s.in_progress}</p>
          </div>
        </CardContent>
      </Card>
      <Card className="border-green-200 bg-green-50/60">
        <CardContent className="pt-4 pb-4 flex items-center gap-3">
          <CheckCircle className="h-8 w-8 text-green-600 shrink-0" />
          <div>
            <p className="text-xs font-medium text-green-800">Resolved</p>
            <p className="text-2xl font-bold text-green-900">{s.resolved}</p>
          </div>
        </CardContent>
      </Card>
      {showUnreadCard && (
        <Card className="border-red-200 bg-red-50/60">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <Bell className="h-8 w-8 text-red-600 shrink-0" />
            <div>
              <p className="text-xs font-medium text-red-800">Unread by Admin</p>
              <p className="text-2xl font-bold text-red-900">{s.unread_by_admin}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
