import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useIndustry } from '@/hooks/useIndustry';
import { useTicketStats } from '@/hooks/useSupport';
import { SupportStatsBar } from './SupportStatsBar';
import { TicketListView } from './TicketListView';

export function AdminSupportView() {
  const { data: industry } = useIndustry();
  const { data: stats } = useTicketStats();
  const showCompany = industry === 'internal_crm';

  const openCount = stats?.open ?? 0;
  const inProgCount = stats?.in_progress ?? 0;
  const resolvedCount = stats?.resolved ?? 0;

  return (
    <div className="space-y-2">
      <SupportStatsBar />
      {industry === 'internal_crm' && (
        <p className="text-sm text-muted-foreground">Showing tickets from all client companies</p>
      )}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 justify-start">
          <TabsTrigger value="all">All Tickets</TabsTrigger>
          <TabsTrigger value="open" className="gap-1">
            Open
            {openCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                {openCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="gap-1">
            In Progress
            {inProgCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                {inProgCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="resolved" className="gap-1">
            Resolved
            {resolvedCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                {resolvedCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4 focus-visible:outline-none">
          <TicketListView showCompany={showCompany} />
        </TabsContent>
        <TabsContent value="open" className="mt-4 focus-visible:outline-none">
          <TicketListView defaultFilters={{ status: 'open' }} showCompany={showCompany} />
        </TabsContent>
        <TabsContent value="in_progress" className="mt-4 focus-visible:outline-none">
          <TicketListView defaultFilters={{ status: 'in_progress' }} showCompany={showCompany} />
        </TabsContent>
        <TabsContent value="resolved" className="mt-4 focus-visible:outline-none">
          <TicketListView defaultFilters={{ status: 'resolved' }} showCompany={showCompany} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
