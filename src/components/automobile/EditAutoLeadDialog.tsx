import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useUpdateAutoLead } from '@/hooks/useAutoLeads';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import type { AutoLead } from '@/hooks/useAutoLeads';

const autoLeadSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  phone: z.string().trim().min(10, 'Phone must be at least 10 digits').max(15, 'Phone must be less than 15 digits').regex(/^[0-9+\-\s]+$/, 'Invalid phone number format'),
  email: z.string().trim().email('Invalid email address').max(255).optional().or(z.literal('')),
  preferred_vehicle_type: z.enum(['car', 'bike']).optional(),
  preferred_brand: z.string().trim().max(100, 'Brand must be less than 100 characters').optional().or(z.literal('')),
  preferred_model: z.string().trim().max(100, 'Model must be less than 100 characters').optional().or(z.literal('')),
  budget_min: z.number().min(0, 'Minimum budget must be positive').optional(),
  budget_max: z.number().min(0, 'Maximum budget must be positive').optional(),
  financing_needed: z.boolean().default(false),
  insurance_needed: z.boolean().default(false),
  test_drive_requested: z.boolean().default(false),
  source: z.string().trim().max(50).optional().or(z.literal('')),
  status: z.enum(['new_lead', 'contacted', 'test_drive_scheduled', 'quotation_shared', 'negotiation_final_discussion', 'booking_done', 'delivered_sold']).default('new_lead'),
});

type AutoLeadFormData = z.infer<typeof autoLeadSchema>;

interface EditAutoLeadDialogProps {
  lead: AutoLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const vehicleTypes = [
  { value: 'car', label: 'Car' },
  { value: 'bike', label: 'Bike' },
];

const sources = ['Facebook Ads', 'Google Ads', 'WhatsApp', 'CarDekho', 'Cardekho', 'OLX', 'Referral', 'Walk-in', 'Website', 'Other'];

const statusOptions = [
  { value: 'new_lead', label: 'New Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'test_drive_scheduled', label: 'Test Drive Scheduled' },
  { value: 'quotation_shared', label: 'Quotation Shared' },
  { value: 'negotiation_final_discussion', label: 'Negotiation / Final Discussion' },
  { value: 'booking_done', label: 'Booking Done' },
  { value: 'delivered_sold', label: 'Delivered / Sold' },
];

export function EditAutoLeadDialog({ lead, open, onOpenChange }: EditAutoLeadDialogProps) {
  const { toast } = useToast();
  const updateLead = useUpdateAutoLead();

  const form = useForm<AutoLeadFormData>({
    resolver: zodResolver(autoLeadSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      preferred_vehicle_type: undefined,
      preferred_brand: '',
      preferred_model: '',
      budget_min: undefined,
      budget_max: undefined,
      financing_needed: false,
      insurance_needed: false,
      test_drive_requested: false,
      source: '',
      status: 'new_lead',
    },
  });

  // Reset form when lead changes
  useEffect(() => {
    if (lead) {
      form.reset({
        name: lead.name,
        phone: lead.phone,
        email: lead.email || '',
        preferred_vehicle_type: lead.preferred_vehicle_type || undefined,
        preferred_brand: lead.preferred_brand || '',
        preferred_model: lead.preferred_model || '',
        budget_min: lead.budget_min || undefined,
        budget_max: lead.budget_max || undefined,
        financing_needed: lead.financing_needed,
        insurance_needed: lead.insurance_needed,
        test_drive_requested: lead.test_drive_requested,
        source: lead.source || '',
        status: lead.status as any,
      });
    }
  }, [lead, form]);

  const onSubmit = async (data: AutoLeadFormData) => {
    if (!lead) return;

    try {
      await updateLead.mutateAsync({
        id: lead.id,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        preferred_vehicle_type: data.preferred_vehicle_type || null,
        preferred_brand: data.preferred_brand || null,
        preferred_model: data.preferred_model || null,
        budget_min: data.budget_min || null,
        budget_max: data.budget_max || null,
        financing_needed: data.financing_needed,
        insurance_needed: data.insurance_needed,
        test_drive_requested: data.test_drive_requested,
        source: data.source || null,
        status: data.status,
      });

      toast({
        title: 'Success',
        description: 'Auto lead updated successfully',
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error updating auto lead:', error);
      toast({
        title: 'Error',
        description: 'Failed to update auto lead',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Auto Lead</DialogTitle>
          <DialogDescription>
            Update the auto lead information below.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter lead name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sources.map((source) => (
                          <SelectItem key={source} value={source}>
                            {source}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="preferred_vehicle_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehicleTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferred_brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Brand</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Toyota, Honda" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferred_model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Model</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Corolla, City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="budget_min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Min (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Minimum budget"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="budget_max"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Max (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Maximum budget"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel>Requirements</FormLabel>
              <div className="flex flex-wrap gap-4">
                <FormField
                  control={form.control}
                  name="financing_needed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(!!checked)}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Needs Financing</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="insurance_needed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(!!checked)}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Needs Insurance</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="test_drive_requested"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(!!checked)}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Test Drive Requested</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateLead.isPending}>
                {updateLead.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Lead
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}