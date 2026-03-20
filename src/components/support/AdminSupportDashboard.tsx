import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { LifeBuoy, Loader2, Send, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useAdminAddInternalNote,
  useAdminAssignTicket,
  useAdminChangeTicketStatus,
  useAdminReplyToTicket,
  useInternalCrmTickets,
  useSupportTicketInternalNotes,
  useSupportTicketMessages,
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTicketCategory,
  useSupportTicketsRealtimeAdmin,
} from '@/hooks/useSupportTickets';
import { useCurrentProfile } from '@/hooks/useProfiles';
import { useCurrentCompany } from '@/hooks/useCompany';

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'open':
      return 'secondary';
    case 'in_progress':
      return 'default';
    case 'resolved':
      return 'outline';
    case 'closed':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function categoryLabel(category: SupportTicketCategory) {
  switch (category) {
    case 'bug':
      return 'Bug';
    case 'feature_request':
      return 'Feature Request';
    case 'help':
      return 'Help';
    case 'integration':
      return 'Integration';
    default:
      return category;
  }
}

export function AdminSupportDashboard() {
  const { toast } = useToast();
  const { data: profile } = useCurrentProfile();
  const { data: company } = useCurrentCompany();
  const canManageSupport = company?.industry === 'internal_crm';

  const [companyFilter, setCompanyFilter] = useState<string | null>(null);
  const [industryFilter, setIndustryFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<SupportTicketPriority | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const { data: allTickets, isLoading: ticketsLoading } = useInternalCrmTickets();

  const tickets = (allTickets || []).filter((t) => {
    if (companyFilter && t.company_id !== companyFilter) return false;
    if (industryFilter && t.industry_type !== industryFilter) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    return true;
  });

  const selectedTicket = useMemo(() => {
    if (!selectedTicketId || !tickets) return null;
    return tickets.find((t) => t.id === selectedTicketId) ?? null;
  }, [selectedTicketId, tickets]);

  const { data: messages, isLoading: messagesLoading } = useSupportTicketMessages(selectedTicketId);
  const { data: internalNotes, isLoading: internalNotesLoading } = useSupportTicketInternalNotes(selectedTicketId);

  const assignTicket = useAdminAssignTicket();
  const changeStatus = useAdminChangeTicketStatus();
  const addInternalNote = useAdminAddInternalNote();
  const replyTicket = useAdminReplyToTicket();

  const [assignedToDraft, setAssignedToDraft] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<SupportTicketStatus>('open');
  const [internalNoteDraft, setInternalNoteDraft] = useState('');
  const [replyDraft, setReplyDraft] = useState('');
  const [isMutating, setIsMutating] = useState(false);

  const [companyUsers, setCompanyUsers] = useState<Array<{ user_id: string; name: string | null }>>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [ticketCompanyDetails, setTicketCompanyDetails] = useState<{
    name: string;
    phone: string | null;
    email: string;
  } | null>(null);
  const [ticketOwnerDetails, setTicketOwnerDetails] = useState<{
    name: string | null;
    email: string | null;
  } | null>(null);

  useSupportTicketsRealtimeAdmin();

  useEffect(() => {
    if (selectedTicket) {
      setAssignedToDraft(selectedTicket.assigned_to);
      setStatusDraft(selectedTicket.status);
      setInternalNoteDraft('');
      setReplyDraft('');

      // Load company + contact details for the selected ticket
      (async () => {
        try {
          const { data: ticketCompany } = await supabase
            .from('companies')
            .select('name, phone, email')
            .eq('id', selectedTicket.company_id)
            .maybeSingle();
          if (ticketCompany) {
            setTicketCompanyDetails(ticketCompany as any);
          } else {
            setTicketCompanyDetails(null);
          }

          const { data: owner } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('user_id', selectedTicket.user_id)
            .maybeSingle();
          if (owner) {
            setTicketOwnerDetails(owner as any);
          } else {
            setTicketOwnerDetails(null);
          }
        } catch (e) {
          console.error('Failed to load ticket meta details', e);
          setTicketCompanyDetails(null);
          setTicketOwnerDetails(null);
        }
      })();
    } else {
      setTicketCompanyDetails(null);
      setTicketOwnerDetails(null);
    }
  }, [selectedTicketId, selectedTicket]);

  useEffect(() => {
    const loadUsers = async () => {
      if (!selectedTicket?.company_id) return;
      setIsUsersLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, name')
          .eq('company_id', selectedTicket.company_id)
          .order('name', { ascending: true });
        if (error) throw error;
        setCompanyUsers((data || []).map((u) => ({ user_id: u.user_id, name: u.name })));
      } catch (e: any) {
        toast({
          title: 'Failed to load team members',
          description: e?.message || 'Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsUsersLoading(false);
      }
    };

    loadUsers();
  }, [selectedTicket?.company_id, toast]);

  useEffect(() => {
    if (!selectedTicketId && tickets && tickets.length > 0) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [tickets, selectedTicketId]);

  const handleAssign = async () => {
    if (!selectedTicket) return;
    setIsMutating(true);
    try {
      await assignTicket.mutateAsync({ ticketId: selectedTicket.id, assignedTo: assignedToDraft });
      toast({ title: 'Assigned', description: 'Ticket assignment updated.' });
    } catch (e: any) {
      toast({ title: 'Assign failed', description: e?.message || 'Try again.', variant: 'destructive' });
    } finally {
      setIsMutating(false);
    }
  };

  const handleChangeStatus = async (nextStatus: SupportTicketStatus) => {
    if (!selectedTicket) return;
    setIsMutating(true);
    try {
      await changeStatus.mutateAsync({ ticketId: selectedTicket.id, status: nextStatus });
      toast({ title: 'Status updated' });
    } catch (e: any) {
      toast({ title: 'Status update failed', description: e?.message || 'Try again.', variant: 'destructive' });
    } finally {
      setIsMutating(false);
    }
  };

  const handleAddInternalNote = async () => {
    if (!selectedTicket) return;
    if (!internalNoteDraft.trim()) return;
    setIsMutating(true);
    try {
      await addInternalNote.mutateAsync({ ticketId: selectedTicket.id, note: internalNoteDraft.trim() });
      setInternalNoteDraft('');
      toast({ title: 'Internal note added' });
    } catch (e: any) {
      toast({ title: 'Failed to add note', description: e?.message || 'Try again.', variant: 'destructive' });
    } finally {
      setIsMutating(false);
    }
  };

  const handleReply = async () => {
    if (!selectedTicket) return;
    if (!replyDraft.trim()) return;
    setIsMutating(true);
    try {
      await replyTicket.mutateAsync({ ticketId: selectedTicket.id, message: replyDraft.trim() });
      setReplyDraft('');
      toast({ title: 'Reply sent' });
    } catch (e: any) {
      toast({ title: 'Reply failed', description: e?.message || 'Try again.', variant: 'destructive' });
    } finally {
      setIsMutating(false);
    }
  };

  const industries = ['real_estate', 'education', 'automobile_dealers', 'internal_crm'];
  const priorities: SupportTicketPriority[] = ['low', 'medium', 'high'];
  const ALL = '__all__';
  const UNASSIGNED = '__unassigned__';

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-5">
        <Card className="h-[calc(100vh-10rem)] flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">Ticket Queue</CardTitle>
              </div>
              <Badge variant="outline">{tickets ? tickets.length : 0}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Company ID (optional)"
                  value={companyFilter ?? ''}
                  onChange={(e) => setCompanyFilter(e.target.value ? e.target.value : null)}
                />
                <Select
                  value={priorityFilter ?? ALL}
                  onValueChange={(v) => setPriorityFilter(v === ALL ? null : (v as SupportTicketPriority))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All priorities</SelectItem>
                    {priorities.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Select
                value={industryFilter ?? ALL}
                onValueChange={(v) => setIndustryFilter(v === ALL ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All industries</SelectItem>
                  {industries.map((i) => (
                    <SelectItem key={i} value={i}>
                      {i.replaceAll('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex-1 overflow-hidden">
              {ticketsLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Loading tickets...</div>
              ) : (
                <ScrollArea className="h-full">
                  {tickets && tickets.length > 0 ? (
                    <div className="space-y-2 pr-2">
                      {tickets.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTicketId(t.id)}
                          className={cn(
                            'w-full text-left rounded-lg border p-3 transition-colors',
                            selectedTicketId === t.id
                              ? 'border-primary bg-primary/5'
                              : 'hover:border-primary/60'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{t.title}</p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {t.description}
                              </p>
                            </div>
                            <Badge variant={getStatusBadgeVariant(t.status)} className="shrink-0">
                              {t.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span>{categoryLabel(t.category)}</span>
                            <span>•</span>
                            <span>Priority: {t.priority}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-2">
                            Updated {format(new Date(t.updated_at), 'MMM d, p')}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">No tickets match filters.</div>
                  )}
                </ScrollArea>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-7">
        <Card className="h-[calc(100vh-10rem)] flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-base truncate">{selectedTicket ? selectedTicket.title : 'Select a ticket'}</CardTitle>
                {selectedTicket && (
                  <>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                      <Badge variant={getStatusBadgeVariant(selectedTicket.status)}>
                        {selectedTicket.status.replace('_', ' ')}
                      </Badge>
                      <span>{categoryLabel(selectedTicket.category)}</span>
                      <span>•</span>
                      <span>Priority: {selectedTicket.priority}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-2">
                      <span className="font-medium">Company ID:</span>
                      <span>{selectedTicket.company_id}</span>
                      <span>•</span>
                      <span className="font-medium">Industry:</span>
                      <span>{selectedTicket.industry_type.replaceAll('_', ' ')}</span>
                    </div>
                    {ticketCompanyDetails && (
                      <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-2">
                        <span className="font-medium">Company:</span>
                        <span>{ticketCompanyDetails.name}</span>
                        {ticketCompanyDetails.phone && (
                          <>
                            <span>•</span>
                            <span>{ticketCompanyDetails.phone}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{ticketCompanyDetails.email}</span>
                      </div>
                    )}
                    {ticketOwnerDetails && (
                      <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-2">
                        <span className="font-medium">Contact:</span>
                        <span>{ticketOwnerDetails.name || 'Client'}</span>
                        {ticketOwnerDetails.email && (
                          <>
                            <span>•</span>
                            <span>{ticketOwnerDetails.email}</span>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <div className="p-4 flex-1 overflow-hidden">
              {!selectedTicket ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Choose a ticket to view details.
                </div>
              ) : (
                <div className="h-full flex flex-col gap-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">Assign to</div>
                      <Select
                        value={assignedToDraft ?? UNASSIGNED}
                        onValueChange={(v) => {
                          if (!canManageSupport) return;
                          setAssignedToDraft(v === UNASSIGNED ? null : v);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                          {companyUsers.map((u) => (
                            <SelectItem key={u.user_id} value={u.user_id}>
                              {u.name ?? u.user_id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleAssign}
                        disabled={!canManageSupport || isMutating || isUsersLoading}
                      >
                        {isMutating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Assign
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">Change status</div>
                      <Select
                        value={statusDraft}
                        onValueChange={(v) => {
                          if (!canManageSupport) return;
                          setStatusDraft(v as SupportTicketStatus);
                          handleChangeStatus(v as SupportTicketStatus);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-muted-foreground">
                        Updates client tracking and sends a notification.
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">Category</div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{selectedTicket.industry_type.replaceAll('_', ' ')}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {categoryLabel(selectedTicket.category)}
                      </div>
                      {selectedTicket.assigned_to ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <ShieldCheck className="w-4 h-4" />
                          Assigned agent set
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">No assigned agent</div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex-1 overflow-hidden">
                    <div className="text-sm font-medium mb-2">Conversation</div>
                    <ScrollArea className="h-[220px] pr-2">
                      {messagesLoading ? (
                        <div className="text-sm text-muted-foreground">Loading messages...</div>
                      ) : messages && messages.length > 0 ? (
                        <div className="space-y-4">
                          {messages.map((m) => (
                            <div
                              key={m.id}
                              className={cn('flex', m.sender_type === 'client' ? 'justify-end' : 'justify-start')}
                            >
                              <div
                                className={cn(
                                  'max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap',
                                  m.sender_type === 'client' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                )}
                              >
                                <div className="text-sm">{m.message}</div>
                                <div className="mt-1 text-[11px] opacity-80">
                                  {format(new Date(m.created_at), 'p')}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No messages yet.</div>
                      )}
                    </ScrollArea>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Internal Notes</div>
                      {internalNotesLoading ? (
                        <div className="text-sm text-muted-foreground">Loading notes...</div>
                      ) : (
                        <ScrollArea className="h-[140px] pr-2 border rounded-lg p-2">
                          {internalNotes && internalNotes.length > 0 ? (
                            <div className="space-y-2">
                              {internalNotes.map((n) => (
                                <div key={n.id} className="rounded-md bg-muted/30 p-2">
                                  <div className="text-xs text-muted-foreground">
                                    {format(new Date(n.created_at), 'MMM d, p')}
                                  </div>
                                  <div className="text-sm mt-1 whitespace-pre-wrap">{n.note}</div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">No internal notes.</div>
                          )}
                        </ScrollArea>
                      )}
                      <Textarea
                        placeholder="Add internal note (not visible to client)..."
                        value={internalNoteDraft}
                        onChange={(e) => setInternalNoteDraft(e.target.value)}
                        className="min-h-[90px]"
                        disabled={!canManageSupport}
                      />
                      <Button
                        variant="outline"
                        onClick={handleAddInternalNote}
                        disabled={!canManageSupport || isMutating || !internalNoteDraft.trim()}
                      >
                        Add Note
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div className="text-sm font-medium">Reply to Client</div>
                      <Textarea
                        placeholder="Write a reply..."
                        value={replyDraft}
                        onChange={(e) => setReplyDraft(e.target.value)}
                        className="min-h-[120px]"
                        disabled={!canManageSupport}
                      />
                      <Button
                        className="gradient-primary"
                        onClick={handleReply}
                        disabled={!canManageSupport || isMutating || !replyDraft.trim()}
                      >
                        {isMutating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                        Send Reply
                      </Button>
                      <div className="text-xs text-muted-foreground">
                        Client will see this instantly and receive an in-app notification.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />
            <div className="p-4 text-xs text-muted-foreground border-t">
              Filters update the queue in real-time. Status changes trigger in-app notifications to the ticket owner.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

