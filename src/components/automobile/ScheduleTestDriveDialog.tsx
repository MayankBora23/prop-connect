import { useState, useEffect } from 'react';
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
import { useUpdateAutoLead } from '@/hooks/useAutoLeads';
import { useVehicles } from '@/hooks/useVehicles';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Star, User, Phone, Mail, Car } from 'lucide-react';

const scheduleTestDriveSchema = z.object({
  vehicle_id: z.string().min(1, 'Vehicle is required'),
  driver_name: z.string().trim().min(1, 'Driver name is required').max(100, 'Driver name must be less than 100 characters'),
  driver_phone: z.string().trim().min(10, 'Phone must be at least 10 digits').max(15, 'Phone must be less than 15 digits').regex(/^[0-9+\-\s]+$/, 'Invalid phone number format'),
  driver_license: z.string().trim().max(50, 'License number must be less than 50 characters').optional().or(z.literal('')),
  test_drive_date: z.string().min(1, 'Test drive date is required'),
  test_drive_time: z.string().min(1, 'Test drive time is required'),
  duration_minutes: z.number().min(15, 'Duration must be at least 15 minutes').max(180, 'Duration cannot exceed 3 hours').default(30),
});

type ScheduleTestDriveFormData = z.infer<typeof scheduleTestDriveSchema>;

interface ScheduleTestDriveDialogProps {
  lead: { id: string; name: string; phone?: string; email?: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduled?: () => void;
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

export function ScheduleTestDriveDialog({ lead, open, onOpenChange, onScheduled }: ScheduleTestDriveDialogProps) {
  const { toast } = useToast();
  const createTestDrive = useCreateTestDrive();
  const updateLead = useUpdateAutoLead();
  const { data: vehicles } = useVehicles();

  const form = useForm<ScheduleTestDriveFormData>({
    resolver: zodResolver(scheduleTestDriveSchema),
    defaultValues: {
      vehicle_id: '',
      driver_name: '',
      driver_phone: '',
      driver_license: '',
      test_drive_date: '',
      test_drive_time: '',
      duration_minutes: 30,
    },
  });

  // Pre-fill driver info from lead if available
  useEffect(() => {
    if (lead && open) {
      form.setValue('driver_name', lead.name);
      if (lead.phone) {
        form.setValue('driver_phone', lead.phone);
      }
    }
  }, [lead, open, form]);

  const onSubmit = async (data: ScheduleTestDriveFormData) => {
    if (!lead) return;

    try {
      await createTestDrive.mutateAsync({
        lead_id: lead.id,
        vehicle_id: data.vehicle_id,
        driver_name: data.driver_name,
        driver_phone: data.driver_phone,
        driver_license: data.driver_license || null,
        test_drive_date: data.test_drive_date,
        test_drive_time: data.test_drive_time,
        duration_minutes: data.duration_minutes,
        status: 'scheduled', // Always set to scheduled when creating from pipeline
      });

      toast({
        title: 'Test drive scheduled',
        description: `Test drive for ${data.driver_name} has been scheduled successfully.`,
      });

      form.reset();
      onOpenChange(false);
      onScheduled?.();
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

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Test Drive</DialogTitle>
          <DialogDescription>
            Schedule a test drive for the selected lead. Fill in the vehicle and timing details.
          </DialogDescription>
        </DialogHeader>

        {/* Lead Info Display */}
        <div className="bg-muted/50 p-4 rounded-lg mb-4">
          <h4 className="font-medium text-foreground mb-3">Lead Information</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{lead.name}</span>
            </div>
            {lead.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{lead.phone}</span>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{lead.email}</span>
              </div>
            )}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
                          <div className="flex items-center gap-2">
                            <Car className="w-4 h-4" />
                            {vehicle.year} {vehicle.brand} {vehicle.model} {vehicle.variant && `(${vehicle.variant})`}
                          </div>
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
