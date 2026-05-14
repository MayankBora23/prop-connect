import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentProfile } from '@/hooks/useProfiles';
import { useIndustry } from '@/hooks/useIndustry';
import { AdminSupportView } from './AdminSupportView';
import { ClientSupportView } from './ClientSupportView';

export function SupportView() {
  const { isLoading: profileLoading } = useCurrentProfile();
  const { data: industry, isLoading: industryLoading, isLoaded } = useIndustry();

  if (profileLoading || industryLoading || !isLoaded) {
    return (
      <div className="space-y-4 max-w-6xl mx-auto">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Only the internal CRM company sees the cross-tenant support desk.
  // Client industries (real_estate, education, automobile) always get the
  // panel with "New ticket" — even if their role is admin/super_admin locally.
  const isInternalSupportDesk = industry === 'internal_crm';

  return (
    <div className="max-w-7xl mx-auto">
      {isInternalSupportDesk ? <AdminSupportView /> : <ClientSupportView />}
    </div>
  );
}
