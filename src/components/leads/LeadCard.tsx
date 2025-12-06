import { Phone, Mail, MapPin, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Lead } from '@/hooks/useLeads';
import { format } from 'date-fns';

interface LeadCardProps {
  lead: Lead;
  onClick?: () => void;
}

export function LeadCard({ lead, onClick }: LeadCardProps) {
  return (
    <div
      onClick={onClick}
      className="card-elevated p-4 cursor-pointer hover:shadow-lg transition-all duration-200 animate-scale-in"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
            {lead.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-sm">{lead.name}</h4>
            <p className="text-xs text-muted-foreground">{lead.source || 'Unknown'}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Phone className="w-3.5 h-3.5" />
          <span>{lead.phone}</span>
        </div>
        {lead.location && (
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate">{lead.location}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" />
          <span>{format(new Date(lead.last_contact), 'MMM d, yyyy')}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">{lead.property_type || 'Not specified'}</span>
          <span className="text-xs font-semibold text-primary">{lead.budget || 'No budget'}</span>
        </div>
      </div>

      {lead.tags && lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {lead.tags.map((tag) => (
            <span
              key={tag}
              className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                tag === 'Hot Lead' ? 'bg-destructive/10 text-destructive' :
                tag === 'Premium' ? 'bg-warning/10 text-warning' :
                tag === 'Ready to Buy' ? 'bg-success/10 text-success' :
                'bg-secondary text-secondary-foreground'
              )}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {lead.assigned_to && (
        <div className="mt-3 text-xs text-muted-foreground">
          Assigned to: <span className="font-medium text-foreground">{lead.assigned_to}</span>
        </div>
      )}
    </div>
  );
}
