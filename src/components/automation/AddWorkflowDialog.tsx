import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateWorkflow } from '@/hooks/useWorkflows';
import { useToast } from '@/hooks/use-toast';
import { Zap, Loader2 } from 'lucide-react';

const workflowSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  trigger_event: z.string().min(1, 'Trigger is required'),
  action: z.string().min(1, 'Action is required'),
});

type WorkflowFormData = z.infer<typeof workflowSchema>;

interface AddWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const triggerOptions = [
  'When new lead is created',
  'Lead not responding for 24 hours',
  'Lead not responding for 48 hours',
  'Site visit scheduled',
  'Site visit completed',
  'Follow-up missed',
  'Lead stage changed',
  'New property added',
];

const actionOptions = [
  'Send WhatsApp welcome message',
  'Send WhatsApp follow-up message',
  'Send email notification',
  'Create follow-up task',
  'Notify team manager',
  'Update lead stage',
  'Send property details',
  'Schedule reminder',
];

export function AddWorkflowDialog({ open, onOpenChange }: AddWorkflowDialogProps) {
  const { toast } = useToast();
  const createWorkflow = useCreateWorkflow();

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<WorkflowFormData>({
    resolver: zodResolver(workflowSchema),
  });

  const onSubmit = async (data: WorkflowFormData) => {
    try {
      await createWorkflow.mutateAsync({
        name: data.name,
        trigger_event: data.trigger_event,
        action: data.action,
        status: 'active',
        runs_count: 0,
      });
      toast({
        title: 'Workflow Created',
        description: 'Workflow has been created and activated.',
      });
      reset();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create workflow.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Create Workflow
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Workflow Name *</Label>
            <Input id="name" {...register('name')} placeholder="e.g., Welcome New Leads" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Trigger Event *</Label>
            <Select onValueChange={(value) => setValue('trigger_event', value)}>
              <SelectTrigger>
                <SelectValue placeholder="When should this run?" />
              </SelectTrigger>
              <SelectContent>
                {triggerOptions.map((trigger) => (
                  <SelectItem key={trigger} value={trigger}>
                    {trigger}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.trigger_event && <p className="text-xs text-destructive">{errors.trigger_event.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Action *</Label>
            <Select onValueChange={(value) => setValue('action', value)}>
              <SelectTrigger>
                <SelectValue placeholder="What should happen?" />
              </SelectTrigger>
              <SelectContent>
                {actionOptions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.action && <p className="text-xs text-destructive">{errors.action.message}</p>}
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 gradient-primary border-0" disabled={createWorkflow.isPending}>
              {createWorkflow.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Workflow
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
