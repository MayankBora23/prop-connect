import React from 'react';
import { Phone, Mail, Calendar, Car, IndianRupee, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AutoLead } from '@/hooks/useAutoLeads';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { useProfiles } from '@/hooks/useProfiles';
import { useUpdateAutoLead } from '@/hooks/useAutoLeads';

interface AutoLeadCardProps {
  lead: AutoLead;
  onClick?: () => void;
  onDragStart?: () => void;
  isDragging?: boolean;
  onHistory?: () => void;
}

function AssignLeadSelect({ leadId, assignedTo }: { leadId: string, assignedTo?: string }) {
  const { data: profiles, isLoading } = useProfiles();
  const updateLead = useUpdateAutoLead();

  return (
    <Select
      value={assignedTo ?? 'unassigned'}
      onValueChange={value => {
        updateLead.mutate({ id: leadId, assigned_to: value === 'unassigned' ? null : value });
      }}
      disabled={isLoading || updateLead.isPending}
    >
      <SelectTrigger className="h-7 w-40 text-xs bg-background">
        <SelectValue placeholder="Assign to..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {(profiles || []).map(profile => (
          <SelectItem key={profile.user_id} value={profile.user_id}>
            {profile.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AutoLeadCard({ lead, onClick, onDragStart, isDragging = false, onHistory }: AutoLeadCardProps) {
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
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
            {lead.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-sm">{lead.name}</h4>
            <p className="text-xs text-muted-foreground">{lead.source || 'Unknown'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="text-xs capitalize">
            {lead.status || 'new'}
          </Badge>
        </div>
      </div>

      <div className="space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Phone className="w-3.5 h-3.5" />
          <span>{lead.phone}</span>
        </div>
        {lead.email && (
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" />
          <span>{format(new Date(lead.created_at), 'MMM d, yyyy')}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border">
        <div className="flex items-center gap-2 mb-2">
          <Car className="w-4 h-4 text-primary" />
          <div className="flex-1">
            {lead.preferred_vehicle_type && (
              <span className="text-xs font-medium text-primary capitalize">
                {lead.preferred_vehicle_type}
              </span>
            )}
            {lead.preferred_brand && (
              <p className="text-xs text-muted-foreground">{lead.preferred_brand}</p>
            )}
            {lead.preferred_model && (
              <p className="text-xs text-muted-foreground">{lead.preferred_model}</p>
            )}
          </div>
        </div>

        {lead.budget_min && lead.budget_max && (
          <div className="flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-green-600" />
            <span className="text-xs font-semibold text-green-600">
              ₹{lead.budget_min.toLocaleString()} - ₹{lead.budget_max.toLocaleString()}
            </span>
          </div>
        )}

        <div className="flex gap-1 mt-2">
          {lead.financing_needed && (
            <Badge variant="secondary" className="text-xs">
              Needs Finance
            </Badge>
          )}
          {lead.insurance_needed && (
            <Badge variant="secondary" className="text-xs">
              Needs Insurance
            </Badge>
          )}
          {lead.test_drive_requested && (
            <Badge variant="secondary" className="text-xs">
              Test Drive
            </Badge>
          )}
        </div>
      </div>

      {lead.tags && lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {lead.tags.map((tag) => (
            <span
              key={tag}
              className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                'bg-secondary text-secondary-foreground'
              )}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
        <span>Assigned to:</span>
        <AssignLeadSelect leadId={lead.id} assignedTo={lead.assigned_to} />
      </div>

      {onHistory && (
        <div className="mt-2 flex gap-2">
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
        </div>
      )}
    </div>
  );
}
