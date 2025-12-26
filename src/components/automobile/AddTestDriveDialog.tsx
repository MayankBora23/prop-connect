import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCreateTestDrive } from '@/hooks/useTestDrives';
import { useAutoLeads } from '@/hooks/useAutoLeads';
import { useVehicles } from '@/hooks/useVehicles';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Star } from 'lucide-react';

const testDriveSchema = z.object({
  lead_id: z.string().uuid().optional(),
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
});

type TestDriveFormData = z.infer<typeof testDriveSchema>;

interface AddTestDriveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function AddTestDriveDialog({ open, onOpenChange }: AddTestDriveDialogProps) {
  const { toast } = useToast();
  const createTestDrive = useCreateTestDrive();
  const { data: leads } = useAutoLeads();
  const { data: vehicles } = useVehicles();

  const form = useForm<TestDriveFormData>({
    resolver: zodResolver(testDriveSchema),
    defaultValues: {
      lead_id: undefined,
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

  const onSubmit = async (data: TestDriveFormData) => {
    try {
      await createTestDrive.mutateAsync({
        lead_id: data.lead_id === 'none' ? null : data.lead_id || null,
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

      toast({
        title: 'Test drive scheduled',
        description: `Test drive for ${data.driver_name} has been scheduled successfully.`,
      });

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
            Schedule a test drive for a customer. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="lead_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a lead (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No lead selected</SelectItem>
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
              <Button type="submit" disabled={createTestDrive.isPending} className="gradient-primary border-0">
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