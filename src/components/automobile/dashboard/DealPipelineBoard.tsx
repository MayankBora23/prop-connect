import { useState } from 'react';
import { useUpdateAutoLead, type AutoLead } from '@/hooks/useAutoLeads';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { GripVertical } from 'lucide-react';

interface PipelineStage {
  id: string;
  label: string;
  color: string;
  count: number;
  revenue: number;
  leads: AutoLead[];
}

interface DealPipelineBoardProps {
  stages: PipelineStage[];
}

export function DealPipelineBoard({ stages }: DealPipelineBoardProps) {
  const updateLead = useUpdateAutoLead();
  const [draggedLead, setDraggedLead] = useState<AutoLead | null>(null);

  const handleDrop = async (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    if (draggedLead && draggedLead.status !== newStage) {
      try {
        await updateLead.mutateAsync({ id: draggedLead.id, status: newStage });
        toast.success('Lead moved successfully');
      } catch {
        toast.error('Failed to update lead');
      }
    }
    setDraggedLead(null);
  };

  return (
    <div className="card-elevated overflow-hidden p-6">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Deal Pipeline</h3>
          <p className="text-sm text-muted-foreground">Drag leads between stages · stage revenue shown</p>
        </div>
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-3">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className="w-[260px] shrink-0 rounded-xl border border-border/60 bg-secondary/30"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <div className="border-b border-border/60 p-3">
                <div className="flex items-center gap-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full', stage.color)} />
                  <span className="text-sm font-semibold text-foreground">{stage.label}</span>
                  <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-xs font-bold">
                    {stage.count}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  ₹{(stage.revenue / 100000).toFixed(1)}L potential
                </p>
              </div>
              <div className="max-h-[320px] space-y-2 overflow-y-auto p-2">
                {stage.leads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={() => setDraggedLead(lead)}
                    className={cn(
                      'cursor-grab rounded-lg border border-border bg-card p-3 shadow-sm transition-all active:cursor-grabbing',
                      'hover:border-primary/40 hover:shadow-md',
                      draggedLead?.id === lead.id && 'opacity-50'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{lead.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{lead.phone}</p>
                        {lead.preferred_brand && (
                          <p className="mt-1 truncate text-xs text-primary">
                            {lead.preferred_brand} {lead.preferred_model ?? ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {stage.leads.length === 0 && (
                  <p className="py-8 text-center text-xs text-muted-foreground">Drop leads here</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
