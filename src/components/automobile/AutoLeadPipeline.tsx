import { useState } from 'react';
import { useAutoLeads, AutoLead, useUpdateAutoLead } from '@/hooks/useAutoLeads';
import { AutoLeadCard } from './AutoLeadCard';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const stages: { id: string; label: string; color: string }[] = [
  { id: 'new_lead', label: 'New Lead', color: 'bg-blue-500' },
  { id: 'contacted', label: 'Contacted', color: 'bg-yellow-500' },
  { id: 'test_drive_scheduled', label: 'Test Drive Scheduled', color: 'bg-orange-500' },
  { id: 'quotation_shared', label: 'Quotation Shared', color: 'bg-purple-500' },
  { id: 'negotiation_final_discussion', label: 'Negotiation / Final Discussion', color: 'bg-pink-500' },
  { id: 'booking_done', label: 'Booking Done', color: 'bg-green-500' },
  { id: 'delivered_sold', label: 'Delivered / Sold', color: 'bg-emerald-600' },
];

export function AutoLeadPipeline() {
  const { data: leads, isLoading } = useAutoLeads();
  const updateLead = useUpdateAutoLead();
  const [draggedLead, setDraggedLead] = useState<AutoLead | null>(null);

  const getLeadsByStage = (stage: string) => {
    return (leads || []).filter((lead) => lead.status === stage);
  };

  const handleDragStart = (lead: AutoLead) => {
    setDraggedLead(lead);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
  };

  const handleDrop = async (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    if (draggedLead && draggedLead.status !== newStage) {
      try {
        await updateLead.mutateAsync({ id: draggedLead.id, status: newStage });
        toast.success(`Lead moved to ${stages.find(s => s.id === newStage)?.label || newStage}`);
      } catch (error) {
        toast.error('Failed to update lead status');
      }
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
                  <AutoLeadCard
                    key={lead.id}
                    lead={lead}
                    onDragStart={() => handleDragStart(lead)}
                    isDragging={draggedLead?.id === lead.id}
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
