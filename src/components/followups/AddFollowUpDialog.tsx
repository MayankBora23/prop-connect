import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateFollowUp } from '@/hooks/useFollowUps';
import { useLeads } from '@/hooks/useLeads';
import { useProfiles } from '@/hooks/useProfiles';
import { useToast } from '@/hooks/use-toast';
import { Bell, Loader2, User } from 'lucide-react';

const followUpSchema = z.object({
  lead_id: z.string().min(1, 'Lead is required'),
  type: z.enum(['call', 'whatsapp', 'meeting', 'email']),
  follow_up_date: z.string().min(1, 'Date is required'),
  follow_up_time: z.string().min(1, 'Time is required'),
  notes: z.string().max(500).optional(),
});

type FollowUpFormData = z.infer<typeof followUpSchema>;

interface AddFollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedLead?: { id: string; name: string };
}

export function AddFollowUpDialog({ open, onOpenChange, preSelectedLead }: AddFollowUpDialogProps) {
  const { toast } = useToast();
  const createFollowUp = useCreateFollowUp();
  const { data: leads } = useLeads();
  const { data: profiles } = useProfiles();

  // Dynamic schema based on whether lead is pre-selected
  const dynamicFollowUpSchema = z.object({
    lead_id: preSelectedLead ? z.string().optional() : z.string().min(1, 'Lead is required'),
    type: z.enum(['call', 'whatsapp', 'meeting', 'email']),
    follow_up_date: z.string().min(1, 'Date is required'),
    follow_up_time: z.string().min(1, 'Time is required'),
    assigned_to: z.string().optional(),
    notes: z.string().max(500).optional(),
  });

  type DynamicFollowUpFormData = z.infer<typeof dynamicFollowUpSchema>;

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<DynamicFollowUpFormData>({
    resolver: zodResolver(dynamicFollowUpSchema),
    defaultValues: {
      type: 'call',
      lead_id: preSelectedLead?.id || '',
      assigned_to: 'unassigned',
    },
  });

  const onSubmit = async (data: DynamicFollowUpFormData) => {
    try {
      await createFollowUp.mutateAsync({
        lead_id: preSelectedLead?.id || data.lead_id,
        type: data.type,
        follow_up_date: data.follow_up_date,
        follow_up_time: data.follow_up_time,
        assigned_to: data.assigned_to === 'unassigned' ? null : data.assigned_to || null,
        notes: data.notes || null,
        status: 'pending',
      });
      toast({
        title: 'Follow-up Created',
        description: 'Follow-up has been scheduled successfully.',
      });
      reset();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create follow-up.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Add Follow-up
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Select Lead *</Label>
            {preSelectedLead ? (
              <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                  {preSelectedLead.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-medium">{preSelectedLead.name}</p>
                  <p className="text-xs text-muted-foreground">Pre-selected lead</p>
                </div>
              </div>
            ) : (
              <Select value={watch('lead_id')} onValueChange={(value) => setValue('lead_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a lead" />
                </SelectTrigger>
                <SelectContent>
                  {(leads || []).map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name} - {lead.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.lead_id && <p className="text-xs text-destructive">{errors.lead_id.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Type *</Label>
            <Select defaultValue="call" onValueChange={(value: 'call' | 'whatsapp' | 'meeting' | 'email') => setValue('type', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call">Phone Call</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Assign to Team Member (Optional)</Label>
            <Select value={watch('assigned_to') || 'unassigned'} onValueChange={(value) => setValue('assigned_to', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose team member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>Unassigned</span>
                  </div>
                </SelectItem>
                {(profiles || []).map((profile) => (
                  <SelectItem key={profile.user_id} value={profile.user_id}>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{profile.name}</span>
                      {profile.role && (
                        <span className="text-xs text-muted-foreground">({profile.role})</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="follow_up_date">Date *</Label>
              <Input id="follow_up_date" type="date" {...register('follow_up_date')} />
              {errors.follow_up_date && <p className="text-xs text-destructive">{errors.follow_up_date.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="follow_up_time">Time *</Label>
              <Input id="follow_up_time" type="time" {...register('follow_up_time')} />
              {errors.follow_up_time && <p className="text-xs text-destructive">{errors.follow_up_time.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea id="notes" {...register('notes')} placeholder="What to discuss..." rows={2} />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 gradient-primary border-0" disabled={createFollowUp.isPending}>
              {createFollowUp.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Follow-up
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
