import { Lead, LeadStage } from '@/data/mockData';
import { LeadCard } from './LeadCard';
import { cn } from '@/lib/utils';
import { useUpdateLead } from '@/hooks/useData';
import { useToast } from '@/hooks/use-toast';

const stages: { id: LeadStage; label: string; color: string }[] = [
  { id: 'new', label: 'New', color: 'bg-info' },
  { id: 'contacted', label: 'Contacted', color: 'bg-primary' },
  { id: 'follow-up', label: 'Follow-up', color: 'bg-warning' },
  { id: 'site-visit', label: 'Site Visit', color: 'bg-info' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-success' },
  { id: 'closed-won', label: 'Closed Won', color: 'bg-success' },
  { id: 'closed-lost', label: 'Closed Lost', color: 'bg-destructive' },
];

interface LeadPipelineProps {
  leads: Lead[];
  onEditLead?: (lead: Lead) => void;
}

export function LeadPipeline({ leads, onEditLead }: LeadPipelineProps) {
  const updateLead = useUpdateLead();
  const { toast } = useToast();

  const getLeadsByStage = (stage: LeadStage) => {
    return leads.filter((lead) => lead.stage === stage);
  };

  const handleStageChange = async (leadId: string, newStage: LeadStage) => {
    try {
      await updateLead.mutateAsync({ id: leadId, data: { stage: newStage } });
      toast({ title: 'Success', description: 'Lead stage updated' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update lead stage',
        variant: 'destructive',
      });
    }
  };

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
              <div className="space-y-3 min-h-[200px] p-2 rounded-xl bg-secondary/50">
                {stageLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onClick={() => {
                      // Allow moving to next stage on click (simple implementation)
                      const currentIndex = stages.findIndex(s => s.id === lead.stage);
                      if (currentIndex < stages.length - 1) {
                        handleStageChange(lead.id, stages[currentIndex + 1].id);
                      }
                    }}
                    onEdit={onEditLead ? () => onEditLead(lead) : undefined}
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
