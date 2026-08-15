import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateSiteVisit } from '@/hooks/useSiteVisits';
import { useLeads } from '@/hooks/useLeads';
import { useProperties } from '@/hooks/useProperties';
import { useProfiles } from '@/hooks/useProfiles';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Loader2, User } from 'lucide-react';
import type { SiteVisitWithDetails } from '@/hooks/useSiteVisits';

const visitSchema = z.object({
  lead_id: z.string().min(1, 'Lead is required'),
  property_id: z.string().min(1, 'Property is required'),
  visit_date: z.string().min(1, 'Date is required'),
  visit_time: z.string().min(1, 'Time is required'),
  assigned_to: z.string().optional(),
  feedback: z.string().max(500).optional(),
});

type VisitFormData = z.infer<typeof visitSchema>;

interface EditSiteVisitDialogProps {
  visit: SiteVisitWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSiteVisitDialog({ visit, open, onOpenChange }: EditSiteVisitDialogProps) {
  const { toast } = useToast();
  const updateVisit = useUpdateSiteVisit();
  const { data: leads } = useLeads();
  const { data: properties } = useProperties();
  const { data: profiles } = useProfiles();

  const form = useForm<VisitFormData>({
    resolver: zodResolver(visitSchema),
    defaultValues: {
      lead_id: visit?.lead_id || '',
      property_id: visit?.property_id || '',
      visit_date: visit?.visit_date || '',
      visit_time: visit?.visit_time || '',
      assigned_to: visit?.assigned_to || 'unassigned',
      feedback: visit?.feedback || '',
    },
  });

  // Update form values when visit changes
  React.useEffect(() => {
    if (visit) {
      form.reset({
        lead_id: visit.lead_id,
        property_id: visit.property_id,
        visit_date: visit.visit_date,
        visit_time: visit.visit_time,
        assigned_to: visit.assigned_to || 'unassigned',
        feedback: visit.feedback || '',
      });
    }
  }, [visit, form]);

  const onSubmit = async (data: VisitFormData) => {
    if (!visit) return;

    try {
      await updateVisit.mutateAsync({
        id: visit.id,
        lead_id: data.lead_id,
        property_id: data.property_id,
        visit_date: data.visit_date,
        visit_time: data.visit_time,
        assigned_to: data.assigned_to === 'unassigned' ? null : data.assigned_to || null,
        feedback: data.feedback || null,
      });

      toast({
        title: 'Visit Updated',
        description: 'Site visit has been updated successfully.',
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Update visit error:', error);
      const description =
        error?.message || error?.error || JSON.stringify(error) || 'Failed to update visit. Please try again.';
      toast({
        title: 'Error updating visit',
        description,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Edit Site Visit
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lead">Lead *</Label>
            <Select
              value={form.watch('lead_id')}
              onValueChange={(value) => form.setValue('lead_id', value)}
            >
              <SelectTrigger id="lead">
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
            <Label htmlFor="property">Property *</Label>
            <Select
              value={form.watch('property_id')}
              onValueChange={(value) => form.setValue('property_id', value)}
            >
              <SelectTrigger id="property">
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent>
                {(properties || []).map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.title} - {property.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.property_id && (
              <p className="text-sm text-destructive">{form.formState.errors.property_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned_to">Assign to Team Member (Optional)</Label>
            <Select
              value={form.watch('assigned_to') || 'unassigned'}
              onValueChange={(value) => form.setValue('assigned_to', value)}
            >
              <SelectTrigger id="assigned_to">
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
              <Label htmlFor="visit_date">Date *</Label>
              <Input
                id="visit_date"
                type="date"
                {...form.register('visit_date')}
              />
              {form.formState.errors.visit_date && (
                <p className="text-sm text-destructive">{form.formState.errors.visit_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="visit_time">Time *</Label>
              <Input
                id="visit_time"
                type="time"
                {...form.register('visit_time')}
              />
              {form.formState.errors.visit_time && (
                <p className="text-sm text-destructive">{form.formState.errors.visit_time.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback">Notes</Label>
            <Textarea
              id="feedback"
              placeholder="Additional notes or feedback"
              rows={3}
              {...form.register('feedback')}
            />
            {form.formState.errors.feedback && (
              <p className="text-sm text-destructive">{form.formState.errors.feedback.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateVisit.isPending} className="gradient-primary border-0">
              {updateVisit.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update Visit
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
