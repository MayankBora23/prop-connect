import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateFollowUp } from '@/hooks/useFollowUps';
import { useLeads } from '@/hooks/useLeads';
import { useProfiles } from '@/hooks/useProfiles';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Loader2, User } from 'lucide-react';
import type { FollowUpWithLead } from '@/hooks/useFollowUps';

const followUpSchema = z.object({
  lead_id: z.string().min(1, 'Lead is required'),
  type: z.enum(['call', 'whatsapp', 'meeting', 'email']),
  follow_up_date: z.string().min(1, 'Date is required'),
  follow_up_time: z.string().min(1, 'Time is required'),
  assigned_to: z.string().optional(),
  notes: z.string().max(500).optional(),
});

type FollowUpFormData = z.infer<typeof followUpSchema>;

interface EditFollowUpDialogProps {
  followUp: FollowUpWithLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditFollowUpDialog({ followUp, open, onOpenChange }: EditFollowUpDialogProps) {
  const { toast } = useToast();
  const updateFollowUp = useUpdateFollowUp();
  const { data: leads } = useLeads();
  const { data: profiles } = useProfiles();

  const form = useForm<FollowUpFormData>({
    resolver: zodResolver(followUpSchema),
    defaultValues: {
      lead_id: followUp?.lead_id || '',
      type: followUp?.type || 'call',
      follow_up_date: followUp?.follow_up_date || '',
      follow_up_time: followUp?.follow_up_time || '',
      assigned_to: followUp?.assigned_to || 'unassigned',
      notes: followUp?.notes || '',
    },
  });

  // Update form values when followUp changes
  useEffect(() => {
    if (followUp) {
      form.reset({
        lead_id: followUp.lead_id,
        type: followUp.type,
        follow_up_date: followUp.follow_up_date,
        follow_up_time: followUp.follow_up_time,
        assigned_to: followUp.assigned_to || 'unassigned',
        notes: followUp.notes || '',
      });
    }
  }, [followUp, form]);

  const onSubmit = async (data: FollowUpFormData) => {
    if (!followUp) return;

    try {
      await updateFollowUp.mutateAsync({
        id: followUp.id,
        lead_id: data.lead_id,
        type: data.type,
        follow_up_date: data.follow_up_date,
        follow_up_time: data.follow_up_time,
        assigned_to: data.assigned_to === 'unassigned' ? null : data.assigned_to || null,
        notes: data.notes || null,
      });

      toast({
        title: 'Follow-up Updated',
        description: 'Follow-up has been updated successfully.',
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Update follow-up error:', error);
      const description =
        error?.message || error?.error || JSON.stringify(error) || 'Failed to update follow-up. Please try again.';
      toast({
        title: 'Error updating follow-up',
        description,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Edit Follow-up
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Select Lead *</Label>
            <Select
              value={form.watch('lead_id')}
              onValueChange={(value) => form.setValue('lead_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select lead" />
              </SelectTrigger>
              <SelectContent>
                {(leads || []).map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.name} - {lead.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.lead_id && (
              <p className="text-sm text-destructive">{form.formState.errors.lead_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Type *</Label>
            <Select
              value={form.watch('type')}
              onValueChange={(value: 'call' | 'whatsapp' | 'meeting' | 'email') => form.setValue('type', value)}
            >
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
            <Select
              value={form.watch('assigned_to') || 'unassigned'}
              onValueChange={(value) => form.setValue('assigned_to', value)}
            >
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
              <Input
                id="follow_up_date"
                type="date"
                {...form.register('follow_up_date')}
              />
              {form.formState.errors.follow_up_date && (
                <p className="text-sm text-destructive">{form.formState.errors.follow_up_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="follow_up_time">Time *</Label>
              <Input
                id="follow_up_time"
                type="time"
                {...form.register('follow_up_time')}
              />
              {form.formState.errors.follow_up_time && (
                <p className="text-sm text-destructive">{form.formState.errors.follow_up_time.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="What to discuss..."
              rows={2}
              {...form.register('notes')}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 gradient-primary border-0" disabled={updateFollowUp.isPending}>
              {updateFollowUp.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update Follow-up
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
