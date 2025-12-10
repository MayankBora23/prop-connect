import { Phone, Mail, MapPin, Calendar, Zap, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Lead } from '@/hooks/useLeads';
import { useScoreLead } from '@/hooks/useLeads';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface LeadCardProps {
  lead: Lead;
  onClick?: () => void;
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

export function LeadCard({ lead, onClick }: LeadCardProps) {
  const scoreLead = useScoreLead();

  const handleScore = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await scoreLead.mutateAsync(lead.id);
      toast.success('Lead scored successfully');
    } catch (error) {
      toast.error('Failed to score lead');
    }
  };

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
        
        {/* Lead Score Badge */}
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
