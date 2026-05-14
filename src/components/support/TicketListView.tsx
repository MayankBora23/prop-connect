import { useMemo, useState } from 'react';
import { CirclePlus, LifeBuoy, Search, ArrowLeft } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentProfile } from '@/hooks/useProfiles';
import { useMarkTicketRead, useTickets } from '@/hooks/useSupport';
import type { SupportTicketFilters } from '@/types/support';
import { TicketCard } from './TicketCard';
import { TicketDetail } from './TicketDetail';

interface TicketListViewProps {
  defaultFilters?: Pick<SupportTicketFilters, 'status'>;
  showCompany?: boolean;
  /** When set, shows a primary CTA to open the new-ticket flow (client panel). */
  onOpenNewTicket?: () => void;
}

export function TicketListView({ defaultFilters, showCompany, onOpenNewTicket }: TicketListViewProps) {
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const markRead = useMarkTicketRead();

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(defaultFilters?.status ?? '');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');

  const mergedFilters = useMemo((): SupportTicketFilters => {
    let status: string | undefined;
    if (statusFilter === 'all') status = undefined;
    else if (statusFilter) status = statusFilter;
    else status = defaultFilters?.status;

    return {
      status,
      priority: priorityFilter || undefined,
      category: categoryFilter || undefined,
      search: search.trim() || undefined,
      company: showCompany && companyFilter.trim() ? companyFilter.trim() : undefined,
    };
  }, [statusFilter, priorityFilter, categoryFilter, search, companyFilter, showCompany, defaultFilters?.status]);

  const { data: tickets = [], isLoading } = useTickets(mergedFilters);

  const statusSelectValue =
    statusFilter === 'all' ? 'all' : statusFilter || defaultFilters?.status || 'all';

  const filtersActive =
    !!search.trim() ||
    statusFilter === 'all' ||
    (!!statusFilter && statusFilter !== (defaultFilters?.status ?? '')) ||
    !!priorityFilter ||
    !!categoryFilter ||
    !!(showCompany && companyFilter.trim());

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setCategoryFilter('');
    setCompanyFilter('');
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 min-h-[calc(100vh-12rem)]">
      <div className="w-full md:w-96 shrink-0 flex flex-col min-h-0 border rounded-lg bg-card">
        <div className="p-3 border-b space-y-3">
          {onOpenNewTicket && (
            <Button type="button" className="w-full gap-2" size="lg" onClick={onOpenNewTicket}>
              <CirclePlus className="h-5 w-5" />
              New ticket
            </Button>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[200px] space-y-1">
              <Label className="sr-only">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search tickets by title or description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={statusSelectValue}
              onValueChange={(v) => setStatusFilter(v === 'all' ? 'all' : v)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={priorityFilter || 'all'}
              onValueChange={(v) => setPriorityFilter(v === 'all' ? '' : v)}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={categoryFilter || 'all'}
              onValueChange={(v) => setCategoryFilter(v === 'all' ? '' : v)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="feature_request">Feature Request</SelectItem>
                <SelectItem value="help">Help</SelectItem>
                <SelectItem value="integration">Integration</SelectItem>
                <SelectItem value="billing">Billing</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {showCompany && (
              <Input
                className="w-[160px]"
                placeholder="Company name..."
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
              />
            )}
          </div>
          <p className="text-xs text-muted-foreground">{tickets.length} tickets</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <>
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <LifeBuoy className="h-12 w-12 text-muted-foreground mb-3" />
              {!filtersActive ? (
                <div className="space-y-3">
                  <p className="text-muted-foreground">No support tickets yet — great news!</p>
                  {onOpenNewTicket && (
                    <Button type="button" size="lg" className="gap-2" onClick={onOpenNewTicket}>
                      <CirclePlus className="h-5 w-5" />
                      New ticket
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-muted-foreground mb-3">No tickets match your filters</p>
                  <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                </>
              )}
            </div>
          ) : (
            tickets.map((t) => (
              <TicketCard
                key={t.id}
                ticket={t}
                isSelected={selectedTicketId === t.id}
                showCompany={showCompany}
                showUnreadDot={
                  (profile?.role === 'super_admin' || profile?.role === 'admin') &&
                  !t.is_read_by_admin
                }
                onClick={() => {
                  setSelectedTicketId(t.id);
                  const as_admin = profile?.role === 'super_admin' || profile?.role === 'admin';
                  markRead.mutate(
                    { ticket_id: t.id, as_admin },
                    {
                      onSuccess: () => {
                        queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
                        queryClient.invalidateQueries({ queryKey: ['support-stats'] });
                      },
                    }
                  );
                }}
              />
            ))
          )}
        </div>
      </div>

      <div className="hidden md:flex flex-1 border rounded-lg bg-card min-h-[24rem] flex-col min-w-0">
        {selectedTicketId ? (
          <TicketDetail ticketId={selectedTicketId} onClose={() => setSelectedTicketId(null)} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 gap-4">
            <LifeBuoy className="h-14 w-14 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold mb-1">Select a ticket</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Pick a ticket on the left to open the thread
              </p>
            </div>
            {onOpenNewTicket && (
              <Button type="button" size="lg" className="gap-2" onClick={onOpenNewTicket}>
                <CirclePlus className="h-5 w-5" />
                New ticket
              </Button>
            )}
          </div>
        )}
      </div>

      {selectedTicketId && (
        <div className="md:hidden fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center gap-2 border-b px-2 py-2 shrink-0">
            <Button type="button" variant="ghost" size="icon" onClick={() => setSelectedTicketId(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="text-sm font-medium">Back to list</span>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <TicketDetail ticketId={selectedTicketId} onClose={() => setSelectedTicketId(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
