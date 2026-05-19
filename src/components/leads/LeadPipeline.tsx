import { useState } from 'react';
import { useLeads, useUpdateLead, type Lead } from '@/hooks/useLeads';
import { LeadCard } from './LeadCard';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { Enums } from '@/integrations/supabase/types';

type LeadStage = Enums<'lead_stage'>;

interface LeadPipelineProps {
  onOpenHistory?: (lead: Lead) => void;
}

const stages: { id: LeadStage; label: string; color: string }[] = [
  { id: 'new', label: 'New', color: 'bg-info' },
  { id: 'contacted', label: 'Contacted', color: 'bg-primary' },
  { id: 'follow-up', label: 'Follow-up', color: 'bg-warning' },
  { id: 'site-visit', label: 'Site Visit', color: 'bg-info' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-success' },
  { id: 'closed-won', label: 'Closed Won', color: 'bg-success' },
  { id: 'closed-lost', label: 'Closed Lost', color: 'bg-destructive' },
];

export function LeadPipeline({ onOpenHistory }: LeadPipelineProps) {
  const { data: leads, isLoading } = useLeads();
  const updateLead = useUpdateLead();
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);

  const getLeadsByStage = (stage: LeadStage) => {
    return (leads || []).filter((lead) => lead.stage === stage);
  };

  const handleDragStart = (lead: Lead) => {
    setDraggedLead(lead);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
  };

  const handleDrop = (e: React.DragEvent, newStage: LeadStage) => {
    e.preventDefault();
    if (draggedLead && draggedLead.stage !== newStage) {
      updateLead.mutate({ id: draggedLead.id, stage: newStage });
    }
    setDraggedLead(null);
  };

  if (isLoading) {
    return (
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {stages.map((stage) => (
            <div key={stage.id} className="w-72 flex-shrink-0">
              <div className="flex items-center gap-2 mb-4 px-1">
                <div className={cn('w-3 h-3 rounded-full', stage.color)} />
                <h3 className="font-semibold text-foreground text-sm">{stage.label}</h3>
              </div>
              <div className="space-y-3 min-h-[200px] p-2 rounded-xl bg-secondary/50">
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {stages.map((stage) => {
          const stageLeads = getLeadsByStage(stage.id);
          return (
            <div key={stage.id} className="w-72 flex-shrink-0">
              <div className="flex items-center gap-2 mb-4 px-1">
                <div className={cn('w-3 h-3 rounded-full', stage.color)} />
                <h3 className="font-semibold text-foreground text-sm">{stage.label}</h3>
                <span className="ml-auto bg-secondary text-secondary-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                  {stageLeads.length}
                </span>
              </div>
              <div
                className="space-y-3 min-h-[200px] p-2 rounded-xl bg-secondary/50 transition-colors hover:bg-secondary/70"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                {stageLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onDragStart={() => handleDragStart(lead)}
                    isDragging={draggedLead?.id === lead.id}
                    onHistory={() => onOpenHistory?.(lead)}
                  />
                ))}
                {stageLeads.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No leads in this stage
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}



