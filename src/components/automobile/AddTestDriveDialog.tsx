import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCreateTestDrive } from '@/hooks/useTestDrives';
import { useCreateAutoLead, useUpdateAutoLead } from '@/hooks/useAutoLeads';
import { useAutoLeads } from '@/hooks/useAutoLeads';
import { useVehicles } from '@/hooks/useVehicles';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Star } from 'lucide-react';

const testDriveSchema = z.object({
  lead_mode: z.enum(['existing', 'new']).default('existing'),
  lead_id: z.string().uuid().optional(),
  // New lead fields
  new_lead_name: z.string().trim().min(1, 'Lead name is required').max(100, 'Lead name must be less than 100 characters').optional(),
  new_lead_phone: z.string().trim().min(10, 'Phone must be at least 10 digits').max(15, 'Phone must be less than 15 digits').regex(/^[0-9+\-\s]+$/, 'Invalid phone number format').optional(),
  new_lead_email: z.string().email('Invalid email format').optional().or(z.literal('')),
  vehicle_id: z.string().min(1, 'Vehicle is required'),
  driver_name: z.string().trim().min(1, 'Driver name is required').max(100, 'Driver name must be less than 100 characters'),
  driver_phone: z.string().trim().min(10, 'Phone must be at least 10 digits').max(15, 'Phone must be less than 15 digits').regex(/^[0-9+\-\s]+$/, 'Invalid phone number format'),
  driver_license: z.string().trim().max(50, 'License number must be less than 50 characters').optional().or(z.literal('')),
  test_drive_date: z.string().min(1, 'Test drive date is required'),
  test_drive_time: z.string().min(1, 'Test drive time is required'),
  duration_minutes: z.number().min(15, 'Duration must be at least 15 minutes').max(180, 'Duration cannot exceed 3 hours').default(30),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']).default('scheduled'),
  feedback: z.string().trim().max(1000, 'Feedback must be less than 1000 characters').optional().or(z.literal('')),
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5').optional(),
}).refine((data) => {
  // If creating new lead, name and phone are required
  if (data.lead_mode === 'new' && (!data.new_lead_name?.trim() || !data.new_lead_phone?.trim())) {
    return false;
  }
  // For existing leads, lead_id is optional (can be pre-selected)
  return true;
}, {
  message: "Please provide new lead details (name and phone required)",
  path: ["lead_mode"],
});

type TestDriveFormData = z.infer<typeof testDriveSchema>;

interface AddTestDriveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedLead?: { id: string; name: string } | null;
}

const testDriveStatuses = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
];

const ratings = [
  { value: 1, label: '1 Star' },
  { value: 2, label: '2 Stars' },
  { value: 3, label: '3 Stars' },
  { value: 4, label: '4 Stars' },
  { value: 5, label: '5 Stars' },
];

export function AddTestDriveDialog({ open, onOpenChange, preSelectedLead }: AddTestDriveDialogProps) {
  const { toast } = useToast();
  const createTestDrive = useCreateTestDrive();
  const createLead = useCreateAutoLead();
  const updateLead = useUpdateAutoLead();
  const { data: leads } = useAutoLeads();
  const { data: vehicles } = useVehicles();

  // Check if the pre-selected lead exists in the leads list
  const preSelectedLeadExists = preSelectedLead && leads?.some(lead => lead.id === preSelectedLead.id);

  const form = useForm<TestDriveFormData>({
    resolver: zodResolver(testDriveSchema),
    defaultValues: {
      lead_mode: 'existing',
      lead_id: undefined,
      new_lead_name: '',
      new_lead_phone: '',
      new_lead_email: '',
      vehicle_id: '',
      driver_name: '',
      driver_phone: '',
      driver_license: '',
      test_drive_date: '',
      test_drive_time: '',
      duration_minutes: 30,
      status: 'scheduled',
      feedback: '',
      rating: undefined,
    },
  });

  // Handle pre-selected lead
  useEffect(() => {
    if (preSelectedLead && open && leads) {
      // Check if the pre-selected lead exists in the loaded leads
      const leadExists = leads.some(lead => lead.id === preSelectedLead.id);
      if (leadExists) {
        // Set values for pre-selected lead
        form.setValue('lead_mode', 'existing');
        form.setValue('lead_id', preSelectedLead.id);
        form.setValue('new_lead_name', '');
        form.setValue('new_lead_phone', '');
        form.setValue('new_lead_email', '');
        // Clear any existing errors
        form.clearErrors('lead_id');
        form.clearErrors('lead_mode');
      }
    }
  }, [preSelectedLead?.id, open, leads, form]);

  // Clear irrelevant fields when switching lead mode
  const leadMode = form.watch('lead_mode');
  useEffect(() => {
    if (leadMode === 'existing') {
      form.setValue('new_lead_name', '');
      form.setValue('new_lead_phone', '');
      form.setValue('new_lead_email', '');
    } else if (leadMode === 'new') {
      form.setValue('lead_id', undefined);
    }
  }, [leadMode, form]);

  const onSubmit = async (data: TestDriveFormData) => {
    try {
      let leadId = data.lead_id;

      // If creating a new lead, create it first
      if (data.lead_mode === 'new' && data.new_lead_name && data.new_lead_phone) {
        const newLead = await createLead.mutateAsync({
          name: data.new_lead_name,
          phone: data.new_lead_phone,
          email: data.new_lead_email || null,
          status: 'test_drive_scheduled',
          source: 'test_drive_booking',
          financing_needed: false,
          insurance_needed: false,
          test_drive_requested: true,
          notes: [],
          tags: [],
        });
        leadId = newLead.id;
      }

      await createTestDrive.mutateAsync({
        lead_id: leadId || null,
        vehicle_id: data.vehicle_id,
        driver_name: data.driver_name,
        driver_phone: data.driver_phone,
        driver_license: data.driver_license || null,
        test_drive_date: data.test_drive_date,
        test_drive_time: data.test_drive_time,
        duration_minutes: data.duration_minutes,
        status: data.status,
        feedback: data.feedback || null,
        rating: data.rating,
      });

      // Update lead status if it was in test_drive_scheduled stage
      if (leadId && data.lead_mode === 'existing') {
        const lead = leads?.find(l => l.id === leadId);
        if (lead && lead.status === 'test_drive_scheduled') {
          await updateLead.mutateAsync({
            id: leadId,
            status: 'quotation_shared'
          });
        }
      }

      toast({
        title: 'Test drive scheduled',
        description: `Test drive for ${data.driver_name} has been scheduled successfully.`,
      });

      // Reset form but preserve pre-selected lead logic
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Create test drive error:', error);
      const description =
        error?.message || error?.error || JSON.stringify(error) || 'Failed to schedule test drive. Please try again.';
      toast({
        title: 'Error scheduling test drive',
        description,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Test Drive</DialogTitle>
          <DialogDescription>
            Schedule a test drive by selecting an existing lead or creating a new lead entry. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Lead Selection */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="lead_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Selection</FormLabel>
                    <FormControl>
                      <Tabs value={field.value} onValueChange={field.onChange} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="existing">Select Existing Lead</TabsTrigger>
                          <TabsTrigger value="new">Create New Lead</TabsTrigger>
                        </TabsList>

                        <TabsContent value="existing" className="space-y-4">
                          <FormField
                            control={form.control}
                            name="lead_id"
                            render={({ field: leadField }) => (
                              <FormItem>
                                <FormLabel>Existing Lead</FormLabel>
                                <Select onValueChange={leadField.onChange} value={leadField.value || undefined}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a lead" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {(leads || []).map((lead) => (
                                      <SelectItem key={lead.id} value={lead.id}>
                                        {lead.name} - {lead.phone}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TabsContent>

                        <TabsContent value="new" className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="new_lead_name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Lead Name *</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter lead name" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="new_lead_phone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Lead Phone *</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter phone number" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name="new_lead_email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Lead Email (Optional)</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="Enter email address" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TabsContent>
                      </Tabs>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="vehicle_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vehicle for test drive" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(vehicles || []).filter(v => v.status === 'available').map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.year} {vehicle.brand} {vehicle.model} {vehicle.variant && `(${vehicle.variant})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="driver_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Driver Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter driver name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="driver_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Driver Phone *</FormLabel>
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
                name="driver_license"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Driver License</FormLabel>
                    <FormControl>
                      <Input placeholder="License number (optional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        {testDriveStatuses.map((status) => (
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
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="test_drive_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Test Drive Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="test_drive_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Test Drive Time *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="30"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
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
              name="feedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feedback</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Test drive feedback and notes"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rating (1-5 stars)</FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select rating" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ratings.map((rating) => (
                        <SelectItem key={rating.value} value={rating.value.toString()}>
                          <div className="flex items-center gap-2">
                            {[...Array(rating.value)].map((_, i) => (
                              <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            ))}
                            {rating.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTestDrive.isPending}
                className="gradient-primary border-0"
                onClick={(e) => {
                  e.preventDefault();
                  form.handleSubmit(onSubmit)();
                }}
              >
                {createTestDrive.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Schedule Test Drive
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}