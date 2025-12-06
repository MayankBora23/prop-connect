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
import { useToast } from '@/hooks/use-toast';
import { Calendar, Loader2 } from 'lucide-react';

const visitSchema = z.object({
  lead_id: z.string().min(1, 'Lead is required'),
  property_id: z.string().min(1, 'Property is required'),
  visit_date: z.string().min(1, 'Date is required'),
  visit_time: z.string().min(1, 'Time is required'),
  feedback: z.string().max(500).optional(),
});

type VisitFormData = z.infer<typeof visitSchema>;

interface AddSiteVisitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddSiteVisitDialog({ open, onOpenChange }: AddSiteVisitDialogProps) {
  const { toast } = useToast();
  const createVisit = useCreateSiteVisit();
  const { data: leads } = useLeads();
  const { data: properties } = useProperties();

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<VisitFormData>({
    resolver: zodResolver(visitSchema),
  });

  const onSubmit = async (data: VisitFormData) => {
    try {
      await createVisit.mutateAsync({
        lead_id: data.lead_id,
        property_id: data.property_id,
        visit_date: data.visit_date,
        visit_time: data.visit_time,
        feedback: data.feedback || null,
        status: 'scheduled',
      });
      toast({
        title: 'Visit Scheduled',
        description: 'Site visit has been scheduled successfully.',
      });
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
            Schedule Site Visit
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Select Lead *</Label>
            <Select onValueChange={(value) => setValue('lead_id', value)}>
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
