import { useWorkflows, useUpdateWorkflow } from '@/hooks/useWorkflows';
import { Zap, Play, Clock, ArrowRight, MessageSquare, UserPlus, Calendar, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export function AutomationView() {
  const { data: workflows, isLoading } = useWorkflows();
  const updateWorkflow = useUpdateWorkflow();
  const { toast } = useToast();

  const toggleWorkflow = async (id: string, currentStatus: 'active' | 'inactive') => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await updateWorkflow.mutateAsync({ id, status: newStatus });
      toast({
        title: 'Workflow Updated',
        description: `Workflow ${newStatus === 'active' ? 'activated' : 'deactivated'}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update workflow',
        variant: 'destructive',
      });
    }
  };

  const getWorkflowIcon = (name: string) => {
    if (name.toLowerCase().includes('welcome')) return UserPlus;
    if (name.toLowerCase().includes('reminder') || name.toLowerCase().includes('visit')) return Calendar;
    if (name.toLowerCase().includes('response')) return Clock;
    if (name.toLowerCase().includes('follow')) return Bell;
    return MessageSquare;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const workflowList = workflows || [];
  const activeWorkflows = workflowList.filter(w => w.status === 'active');
  const totalRuns = workflowList.reduce((sum, w) => sum + w.runs_count, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-elevated p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{workflowList.length}</p>
            <p className="text-sm text-muted-foreground">Total Workflows</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-success flex items-center justify-center">
            <Play className="w-6 h-6 text-success-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{activeWorkflows.length}</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-info flex items-center justify-center">
            <Clock className="w-6 h-6 text-info-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{totalRuns}</p>
            <p className="text-sm text-muted-foreground">Total Runs</p>
          </div>
        </div>
      </div>

      {/* Workflows List */}
      {workflowList.length > 0 ? (
        <div className="space-y-4">
          {workflowList.map((workflow) => {
            const Icon = getWorkflowIcon(workflow.name);
            return (
              <div key={workflow.id} className="card-elevated p-6 animate-scale-in">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center',
                      workflow.status === 'active' ? 'gradient-primary' : 'bg-secondary'
                    )}>
                      <Icon className={cn(
                        'w-6 h-6',
                        workflow.status === 'active' ? 'text-primary-foreground' : 'text-muted-foreground'
                      )} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{workflow.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium',
                          workflow.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                        )}>
                          {workflow.status}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {workflow.runs_count} runs
                        </span>
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={workflow.status === 'active'}
                    onCheckedChange={() => toggleWorkflow(workflow.id, workflow.status)}
                    disabled={updateWorkflow.isPending}
                  />
                </div>

                <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Trigger</p>
                    <p className="text-sm text-foreground">{workflow.trigger_event}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Action</p>
                    <p className="text-sm text-foreground">{workflow.action}</p>
                  </div>
                </div>

                {workflow.last_run && (
                  <p className="text-xs text-muted-foreground mt-4">
                    Last run: {format(new Date(workflow.last_run), 'MMM d, yyyy h:mm a')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No workflows found. Create your first automation to get started.
        </div>
      )}

      {/* Add New Workflow Button */}
      <Button className="w-full gradient-primary border-0">
        <Zap className="w-4 h-4 mr-2" />
        Create New Workflow
      </Button>
    </div>
  );
}
