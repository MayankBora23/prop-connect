import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateSiteVisit } from '@/hooks/useSiteVisits';
import { useLeads } from '@/hooks/useLeads';
import { useProperties } from '@/hooks/useProperties';
import { useProfiles } from '@/hooks/useProfiles';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Loader2, User } from 'lucide-react';

const visitSchema = z.object({
  lead_id: z.string().min(1, 'Lead is required'),
  property_id: z.string().min(1, 'Property is required'),
  visit_date: z.string().min(1, 'Date is required'),
  visit_time: z.string().min(1, 'Time is required'),
  assigned_to: z.string().optional(),
  feedback: z.string().max(500).optional(),
});

type VisitFormData = z.infer<typeof visitSchema>;

interface AddSiteVisitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedLead?: { id: string; name: string };
  onVisitScheduled?: (leadId: string) => void;
}

export function AddSiteVisitDialog({ open, onOpenChange, preSelectedLead, onVisitScheduled }: AddSiteVisitDialogProps) {
  const { toast } = useToast();
  const createVisit = useCreateSiteVisit();
  const { data: leads } = useLeads();
  const { data: properties } = useProperties();
  const { data: profiles } = useProfiles();

  // Dynamic schema based on whether lead is pre-selected
  const dynamicVisitSchema = z.object({
    lead_id: preSelectedLead ? z.string().optional() : z.string().min(1, 'Lead is required'),
    property_id: z.string().min(1, 'Property is required'),
    visit_date: z.string().min(1, 'Date is required'),
    visit_time: z.string().min(1, 'Time is required'),
    assigned_to: z.string().optional(),
    feedback: z.string().max(500).optional(),
  });

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<VisitFormData>({
    resolver: zodResolver(dynamicVisitSchema),
    defaultValues: {
      lead_id: preSelectedLead?.id || '',
    },
  });

  const onSubmit = async (data: VisitFormData) => {
    try {
      await createVisit.mutateAsync({
        lead_id: preSelectedLead?.id || data.lead_id,
        property_id: data.property_id,
        visit_date: data.visit_date,
        visit_time: data.visit_time,
        assigned_to: data.assigned_to === 'unassigned' ? null : data.assigned_to || null,
        feedback: data.feedback || null,
        status: 'scheduled',
      });
      toast({
        title: 'Visit Scheduled',
        description: 'Site visit has been scheduled successfully.',
      });

      // Call callback if provided (for lead stage updates)
      if (onVisitScheduled && preSelectedLead) {
        onVisitScheduled(preSelectedLead.id);
      }

      reset();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to schedule visit.',
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
            {preSelectedLead ? `Schedule Visit for ${preSelectedLead.name}` : 'Schedule Site Visit'}
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
            <Label>Select Property *</Label>
            <Select onValueChange={(value) => setValue('property_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a property" />
              </SelectTrigger>
              <SelectContent>
                {(properties || []).filter(p => p.status !== 'sold').map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.title} - {property.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.property_id && <p className="text-xs text-destructive">{errors.property_id.message}</p>}
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
              <Label htmlFor="visit_date">Date *</Label>
              <Input id="visit_date" type="date" {...register('visit_date')} />
              {errors.visit_date && <p className="text-xs text-destructive">{errors.visit_date.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="visit_time">Time *</Label>
              <Input id="visit_time" type="time" {...register('visit_time')} />
              {errors.visit_time && <p className="text-xs text-destructive">{errors.visit_time.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback">Notes (Optional)</Label>
            <Textarea id="feedback" {...register('feedback')} placeholder="Any special instructions..." rows={2} />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 gradient-primary border-0" disabled={createVisit.isPending}>
              {createVisit.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Schedule Visit
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
