import React from 'react';
import { Phone, Mail, MapPin, Calendar, Zap, Loader2, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Lead } from '@/hooks/useLeads';
import { useScoreLead, useUpdateLead } from '@/hooks/useLeads';
import { useProfiles } from '@/hooks/useProfiles';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { Enums } from '@/integrations/supabase/types';

interface LeadCardProps {
  lead: Lead;
  onClick?: () => void;
  onDragStart?: () => void;
  isDragging?: boolean;
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-success bg-success/10';
  if (score >= 60) return 'text-primary bg-primary/10';
  if (score >= 40) return 'text-warning bg-warning/10';
  return 'text-muted-foreground bg-muted';
}

function getScoreLabel(score: number) {
  if (score >= 80) return 'Hot';
  if (score >= 60) return 'Warm';
  if (score >= 40) return 'Cool';
  return 'Cold';
}

function LeadStatusSelect({ leadId, leadStatus }: { leadId: string, leadStatus?: Enums<'lead_status'> }) {
  const updateLead = useUpdateLead();

  const getStatusColor = (status: Enums<'lead_status'>) => {
    switch (status) {
      case 'hot': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'warm': return 'bg-warning/10 text-warning border-warning/20';
      case 'cold': return 'bg-info/10 text-info border-info/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Select
      value={leadStatus || 'cold'}
      onValueChange={value => updateLead.mutate({ id: leadId, lead_status: value as Enums<'lead_status'> })}
      disabled={updateLead.isPending}
    >
      <SelectTrigger className={`h-6 w-16 text-xs border ${getStatusColor(leadStatus || 'cold')}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="hot">Hot</SelectItem>
        <SelectItem value="warm">Warm</SelectItem>
        <SelectItem value="cold">Cold</SelectItem>
      </SelectContent>
    </Select>
  );
}

function AssignLeadSelect({ leadId, assignedTo }: { leadId: string, assignedTo?: string }) {
  const { data: profiles, isLoading } = useProfiles();
  const updateLead = useUpdateLead();

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

export function LeadCard({ lead, onClick, onDragStart, isDragging = false }: LeadCardProps) {
  const scoreLead = useScoreLead();
  const updateLead = useUpdateLead();

  const handleScore = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await scoreLead.mutateAsync(lead.id);
      toast.success('Lead scored successfully');
    } catch (error) {
      toast.error('Failed to score lead');
    }
  };

  const handleAddToTelephony = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updateLead = useUpdateLead();
      await updateLead.mutateAsync({
        id: lead.id,
        is_telephony_enabled: true
      });
      toast.success('Lead successfully added to the Telephony queue.');
    } catch (error) {
      console.error('Error adding lead to telephony:', error);
      toast.error('Failed to add lead to Telephony queue');
    }
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
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
            {lead.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-sm">{lead.name}</h4>
            <p className="text-xs text-muted-foreground">{lead.source || 'Unknown'}</p>
          </div>
        </div>
        
        {/* Lead Score Badge & Status */}
        <div className="flex items-center gap-2">
          {lead.lead_score !== null ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1",
                    getScoreColor(lead.lead_score)
                  )}>
                    <Zap className="w-3 h-3" />
                    {lead.lead_score}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold">{getScoreLabel(lead.lead_score)} Lead</p>
                  {lead.score_reasoning && (
                    <p className="text-xs mt-1">{lead.score_reasoning}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={handleScore}
              disabled={scoreLead.isPending}
            >
              {scoreLead.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <Zap className="w-3 h-3 mr-1" />
                  Score
                </>
              )}
            </Button>
          )}
          {/* Lead Status Tag */}
          <div className={cn(
            "px-2 py-1 rounded-full text-xs font-semibold border",
            lead.lead_status === 'hot' ? 'bg-destructive/10 text-destructive border-destructive/20' :
            lead.lead_status === 'warm' ? 'bg-warning/10 text-warning border-warning/20' :
            'bg-info/10 text-info border-info/20'
          )}>
            {lead.lead_status ? lead.lead_status.charAt(0).toUpperCase() + lead.lead_status.slice(1) : 'Cold'}
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
          <span>{format(new Date(lead.created_at), 'MMM d, yyyy')}</span>
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

      <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
        <span>Assigned to:</span>
        <AssignLeadSelect leadId={lead.id} assignedTo={lead.assigned_to} />
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
          onClick={(e) => {
            e.stopPropagation();
            // Add WhatsApp functionality here if needed
          }}
          title="Add to WhatsApp"
        >
          <MessageCircle className="w-3 h-3 mr-1" />
          WhatsApp
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          onClick={handleAddToTelephony}
          title="Add to Telephony"
        >
          <Phone className="w-3 h-3 mr-1" />
          Telephony
        </Button>
      </div>

    </div>
  );
}


