import type { InternalLead } from '@/hooks/useInternalLeads';
import { cn } from '@/lib/utils';
import { Building2, Phone, MapPin, Users, MessageCircle, Calendar, History } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

interface InternalLeadCardProps {
  lead: InternalLead;
  onClick?: () => void;
  onDragStart?: () => void;
  isDragging?: boolean;
  onEdit?: (lead: InternalLead) => void;
  onWhatsApp?: (lead: InternalLead) => void;
  onTelephony?: (lead: InternalLead) => void;
  onHistory?: () => void;
}

export function InternalLeadCard({
  lead,
  onClick,
  onDragStart,
  isDragging = false,
  onEdit,
  onWhatsApp,
  onTelephony,
  onHistory,
}: InternalLeadCardProps) {

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    onWhatsApp?.(lead);
  };

  const handleTelephony = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTelephony?.(lead);
  };

  return (
    <div
      onClick={onClick}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      className={cn(
        "card-elevated p-4 cursor-pointer hover:shadow-lg transition-all duration-200 animate-scale-in",
        isDragging && "opacity-50 rotate-2 scale-105"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm shrink-0">
            {lead.company_name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-sm leading-tight truncate max-w-[120px]">{lead.company_name}</h4>
            <p className="text-xs text-muted-foreground truncate max-w-[120px]">{lead.lead_name}</p>
          </div>
        </div>

        <div className={cn(
          "px-2 py-1 rounded-full text-[10px] font-bold uppercase border tracking-tight shrink-0",
          lead.stage === 'closed_won' ? 'bg-success/10 text-success border-success/20' :
            lead.stage === 'closed_lost' ? 'bg-destructive/10 text-destructive border-destructive/20' :
              'bg-info/10 text-info border-info/20'
        )}>
          {lead.stage.replace(/_/g, ' ')}
        </div>
      </div>

      <div className="space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{lead.industry.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</span>
        </div>
        {lead.phone_no && (
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span>{lead.phone_no}</span>
          </div>
        )}
        {lead.address && (
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{lead.address}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>{format(new Date(lead.created_at), 'MMM d, yyyy')}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span className="font-medium text-foreground">
              {lead.user_limit ? `${lead.user_limit} Users` : 'No limit'}
            </span>
          </div>
          {/* Placeholder for budget or other secondary info if needed */}
        </div>
      </div>

      <div className="mt-3 flex gap-2 flex-wrap">
        {onHistory && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onHistory();
            }}
            title="View History"
          >
            <History className="w-3 h-3 mr-1" />
            History
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[11px] text-green-600 hover:text-green-700 hover:bg-green-50"
          onClick={handleWhatsApp}
          title="Add to WhatsApp"
        >
          <MessageCircle className="w-3 h-3 mr-1" />
          WhatsApp
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[11px] text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          onClick={handleTelephony}
          title="Add to Telephony"
        >
          <Phone className="w-3 h-3 mr-1" />
          Telephony
        </Button>
      </div>
    </div>
  );
}
