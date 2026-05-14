import { format } from 'date-fns';
import { Building2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { SupportTicket } from '@/types/support';
import { StatusBadge } from './TicketBadges';
import { formatIndustryType } from './supportLabels';

function shortTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const h = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  if (h < 24) return format(date, 'HH:mm');
  if (h < 168) return format(date, 'EEE HH:mm');
  return format(date, 'MMM d');
}

interface TicketCardProps {
  ticket: SupportTicket;
  isSelected: boolean;
  onClick: () => void;
  showCompany?: boolean;
  showUnreadDot?: boolean;
}

export function TicketCard({
  ticket,
  isSelected,
  onClick,
  showCompany,
  showUnreadDot,
}: TicketCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-colors border shadow-sm',
        isSelected && 'border-l-4 border-l-primary bg-muted/50',
        !isSelected && 'hover:bg-muted/30'
      )}
    >
      <div
        className="p-3"
        onClick={onClick}
        onKeyDown={(e) => e.key === 'Enter' && onClick()}
        role="button"
        tabIndex={0}
      >
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mb-1">
          <span className="flex items-center gap-1.5 min-w-0">
            {showUnreadDot && (
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" aria-hidden />
            )}
            <span className="truncate">#{ticket.ticket_number}</span>
          </span>
          <span className="shrink-0 tabular-nums">{shortTime(ticket.updated_at)}</span>
        </div>
        <p className="font-medium text-sm truncate mb-1.5">{ticket.title}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <StatusBadge status={ticket.status} />
          {ticket.assignee_name && <span className="truncate">→ {ticket.assignee_name}</span>}
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5 truncate">
          {ticket.creator_name || 'Unknown'}
          {ticket.creator_email ? ` · ${ticket.creator_email}` : ''}
        </p>
        {showCompany && (ticket.company_name || ticket.industry_type) && (
          <div className="flex flex-col gap-0.5 mt-1.5 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5 min-w-0">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{ticket.company_name || '—'}</span>
            </div>
            <span className="pl-4 truncate">{formatIndustryType(ticket.industry_type)}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
