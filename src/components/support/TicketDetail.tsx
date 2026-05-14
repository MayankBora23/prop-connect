import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Loader2, Send, X } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { useCurrentProfile } from '@/hooks/useProfiles';
import { useIndustry } from '@/hooks/useIndustry';
import {
  useAssignTicket,
  useMarkTicketRead,
  useReplyToTicket,
  useTeamMembers,
  useTicket,
  useTicketMessages,
  useTicketRealtime,
  useUpdateTicketStatus,
} from '@/hooks/useSupport';
import type { TicketStatus } from '@/types/support';
import { StatusBadge } from './TicketBadges';
import { formatIndustryType } from './supportLabels';

interface TicketDetailProps {
  ticketId: string;
  onClose: () => void;
}

function formatMessageTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  if (diffInHours < 24) return format(date, 'HH:mm');
  if (diffInHours < 168) return format(date, 'EEE HH:mm');
  return format(date, 'MMM d');
}

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export function TicketDetail({ ticketId, onClose }: TicketDetailProps) {
  const { data: profile } = useCurrentProfile();
  const { data: industry } = useIndustry();
  const { data: ticket, isLoading: ticketLoading } = useTicket(ticketId);

  const isInternalCrmViewer = industry === 'internal_crm';
  const canSeeInternalNotes = industry === 'internal_crm';

  const { data: messages = [], isLoading: messagesLoading } = useTicketMessages(
    ticketId,
    canSeeInternalNotes
  );
  const replyMutation = useReplyToTicket();
  const updateStatus = useUpdateTicketStatus();
  const assignTicket = useAssignTicket();
  const markRead = useMarkTicketRead();

  const { data: teamMembers = [] } = useTeamMembers(
    industry === 'internal_crm' ? ticket?.company_id : undefined,
    { enabled: industry !== 'internal_crm' || !!ticket?.company_id }
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const [reply, setReply] = useState('');
  const [requesterInfoExpanded, setRequesterInfoExpanded] = useState(false);
  const [isInternalNote, setIsInternalNote] = useState(false);

  useTicketRealtime(ticketId);

  useEffect(() => {
    const isCompanyAdmin = profile?.role === 'super_admin' || profile?.role === 'admin';
    if (!ticket || !isCompanyAdmin) return;
    if (!ticket.is_read_by_admin) {
      markRead.mutate({ ticket_id: ticket.id, as_admin: true });
    }
  }, [ticket?.id, ticket?.is_read_by_admin, profile?.role]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, ticketId]);

  if (ticketLoading || !ticket) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const displayName = (m: { sender_name?: string; sender_id: string; sender_type?: string }) => {
    if (profile?.id && m.sender_id === profile.id) return 'You';
    if (m.sender_type === 'admin') {
      return m.sender_name?.trim() || 'Support Team';
    }
    return m.sender_name?.trim() || 'Unknown';
  };

  return (
    <div className="flex flex-col h-full min-h-[320px] max-h-[calc(100vh-8rem)] bg-background">
      <div className="border-b p-3 shrink-0 relative pr-10">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1 h-8 w-8"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </Button>
        <h2 className="text-base font-semibold pr-6 leading-snug">
          {ticket.title}{' '}
          <span className="text-muted-foreground font-normal">#{ticket.ticket_number}</span>
        </h2>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <StatusBadge status={ticket.status} />
          <span className="text-xs text-muted-foreground">
            {formatMessageTime(ticket.created_at)}
          </span>
        </div>
        <div className="mt-3">
          <button
            type="button"
            className="w-full flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-xs hover:bg-muted/60 transition-colors"
            onClick={() => setRequesterInfoExpanded(!requesterInfoExpanded)}
          >
            <span className="font-semibold uppercase tracking-wide text-muted-foreground">
              Requester & Company Info
            </span>
            <svg
              className={`h-4 w-4 text-muted-foreground transition-transform ${requesterInfoExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {requesterInfoExpanded && (
            <div className="mt-2 rounded-md border bg-muted/40 p-3 text-xs space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Requester
              </p>
              <p className="text-sm text-foreground">{ticket.creator_name || 'Unknown'}</p>
              {ticket.creator_email ? (
                <p className="text-muted-foreground break-all">{ticket.creator_email}</p>
              ) : null}
              {industry === 'internal_crm' && ticket.creator_user_id ? (
                <p className="font-mono text-[10px] text-muted-foreground break-all">
                  Auth user: {ticket.creator_user_id}
                </p>
              ) : null}
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground pt-2 border-t border-border/80">
                Company
              </p>
              <p className="text-sm text-foreground">{ticket.company_name || '—'}</p>
              <p className="text-muted-foreground">{formatIndustryType(ticket.industry_type)}</p>
              {ticket.company_contact_email ? (
                <p className="text-muted-foreground break-all">{ticket.company_contact_email}</p>
              ) : null}
              {industry === 'internal_crm' ? (
                <p className="font-mono text-[10px] text-muted-foreground break-all">
                  Company ID: {ticket.company_id}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {isInternalCrmViewer && (
        <div className="border-b p-2 flex flex-wrap gap-2 shrink-0 bg-muted/30">
          <div className="flex-1 min-w-[140px]">
            <Label className="text-[10px] text-muted-foreground">Status</Label>
            <Select
              value={ticket.status}
              onValueChange={(v) =>
                updateStatus.mutate({ ticket_id: ticket.id, new_status: v as TicketStatus })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <Label className="text-[10px] text-muted-foreground">Assign</Label>
            <Select
              value={ticket.assigned_to ?? 'unassigned'}
              onValueChange={(v) =>
                assignTicket.mutate({
                  ticket_id: ticket.id,
                  assigned_to: v === 'unassigned' ? null : v,
                })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {teamMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {messagesLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          messages.map((m) => {
            if (m.message.startsWith('Status updated to')) {
              return (
                <div key={m.id} className="flex justify-center">
                  <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {m.message}
                  </span>
                </div>
              );
            }

            if (m.is_internal && canSeeInternalNotes) {
              return (
                <div key={m.id} className="text-xs border-l-2 border-amber-400 pl-2 py-1 text-amber-950 bg-amber-50/80 rounded-r">
                  <span className="font-medium text-amber-900">Internal</span>{' '}
                  <span className="text-muted-foreground">
                    {displayName(m)} · {formatMessageTime(m.created_at)}
                  </span>
                  <p className="mt-1 whitespace-pre-wrap text-foreground">{m.message}</p>
                </div>
              );
            }

            if (m.is_internal) return null;

            const isOwn = profile?.id != null && m.sender_id === profile.id;

            return (
              <div
                key={m.id}
                className={cn('flex gap-2 max-w-[90%]', isOwn ? 'ml-auto flex-row-reverse' : '')}
              >
                <div className={cn('flex flex-col gap-0.5 min-w-0', isOwn ? 'items-end' : 'items-start')}>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    {!isOwn && <span className="font-medium text-foreground">{displayName(m)}</span>}
                    <span>{formatMessageTime(m.created_at)}</span>
                  </div>
                  <div
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm break-words',
                      isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}
                  >
                    <p className="whitespace-pre-wrap">{m.message}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t p-3 shrink-0 bg-background">
        {canSeeInternalNotes && (
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => setIsInternalNote(!isInternalNote)}
              className={cn(
                "flex items-center gap-2 text-xs px-3 py-1 rounded-full transition-colors",
                isInternalNote 
                  ? "bg-amber-100 text-amber-800 border border-amber-300" 
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <span className={cn("w-2 h-2 rounded-full", isInternalNote ? "bg-amber-500" : "bg-muted-foreground")}></span>
              Internal Note
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <Input
            placeholder={isInternalNote ? "Internal note…" : "Message…"}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            className={cn("flex-1", isInternalNote && "border-amber-300 focus-visible:ring-amber-500")}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!reply.trim() || replyMutation.isPending) return;
                const sender_type = isInternalCrmViewer ? 'admin' : 'client';
                replyMutation.mutate(
                  {
                    ticket_id: ticket.id,
                    message: reply.trim(),
                    is_internal: isInternalNote,
                    sender_type,
                  },
                  { onSuccess: () => setReply('') }
                );
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            className={cn("shrink-0", isInternalNote && "bg-amber-600 hover:bg-amber-700")}
            disabled={!reply.trim() || replyMutation.isPending}
            onClick={() => {
              const sender_type = isInternalCrmViewer ? 'admin' : 'client';
              replyMutation.mutate(
                {
                  ticket_id: ticket.id,
                  message: reply.trim(),
                  is_internal: isInternalNote,
                  sender_type,
                },
                { onSuccess: () => setReply('') }
              );
            }}
            aria-label="Send"
          >
            {replyMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
