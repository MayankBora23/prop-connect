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
import { useCreateBooking } from '@/hooks/useBookings';
import { useUpdateAutoLead } from '@/hooks/useAutoLeads';
import { useVehicles } from '@/hooks/useVehicles';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Phone, Mail, Car, MapPin, Calendar, Clock } from 'lucide-react';

const scheduleBookingSchema = z.object({
  vehicle_id: z.string().min(1, 'Vehicle is required'),
  booking_date: z.string().min(1, 'Booking date is required'),
  delivery_date: z.string().optional(),
  delivery_location: z.string().trim().max(200, 'Delivery location must be less than 200 characters').optional().or(z.literal('')),
  special_requests: z.string().trim().max(1000, 'Special requests must be less than 1000 characters').optional().or(z.literal('')),
  vehicle_price: z.number().min(0, 'Vehicle price must be positive'),
  discount_amount: z.number().min(0, 'Discount cannot be negative').default(0),
  accessories_cost: z.number().min(0, 'Accessories cost cannot be negative').default(0),
  registration_cost: z.number().min(0, 'Registration cost cannot be negative').default(0),
  insurance_cost: z.number().min(0, 'Insurance cost cannot be negative').default(0),
  finance_cost: z.number().min(0, 'Finance cost cannot be negative').default(0),
  down_payment: z.number().min(0, 'Down payment cannot be negative').default(0),
  notes: z.string().trim().max(1000, 'Notes must be less than 1000 characters').optional().or(z.literal('')),
  terms_conditions: z.string().trim().max(2000, 'Terms must be less than 2000 characters').optional().or(z.literal('')),
});

type ScheduleBookingFormData = z.infer<typeof scheduleBookingSchema>;

interface ScheduleBookingDialogProps {
  lead: { id: string; name: string; phone?: string; email?: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBooked?: () => void;
}

export function ScheduleBookingDialog({ lead, open, onOpenChange, onBooked }: ScheduleBookingDialogProps) {
  const { toast } = useToast();
  const createBooking = useCreateBooking();
  const updateAutoLead = useUpdateAutoLead();
  const { data: vehicles } = useVehicles();

  const form = useForm<ScheduleBookingFormData>({
    resolver: zodResolver(scheduleBookingSchema),
    defaultValues: {
      vehicle_id: '',
      booking_date: new Date().toISOString().split('T')[0],
      delivery_date: '',
      delivery_location: '',
      special_requests: '',
      vehicle_price: 0,
      discount_amount: 0,
      accessories_cost: 0,
      registration_cost: 0,
      insurance_cost: 0,
      finance_cost: 0,
      down_payment: 0,
      notes: '',
      terms_conditions: '',
    },
  });

  // Calculate total amount and remaining balance
  const watchedValues = form.watch();
  const totalAmount =
    (watchedValues.vehicle_price || 0) +
    (watchedValues.accessories_cost || 0) +
    (watchedValues.registration_cost || 0) +
    (watchedValues.insurance_cost || 0) +
    (watchedValues.finance_cost || 0) -
    (watchedValues.discount_amount || 0);

  const remainingBalance = totalAmount - (watchedValues.down_payment || 0);

  const onSubmit = async (data: ScheduleBookingFormData) => {
    if (!lead) return;

    try {
      await createBooking.mutateAsync({
        lead_id: lead.id,
        vehicle_id: data.vehicle_id,
        booking_date: data.booking_date,
        delivery_date: data.delivery_date || null,
        delivery_location: data.delivery_location || null,
        special_requests: data.special_requests || null,
        vehicle_price: data.vehicle_price,
        discount_amount: data.discount_amount,
        accessories_cost: data.accessories_cost,
        registration_cost: data.registration_cost,
        insurance_cost: data.insurance_cost,
        finance_cost: data.finance_cost,
        total_amount: totalAmount,
        down_payment: data.down_payment,
        remaining_balance: remainingBalance,
        payment_status: data.down_payment >= totalAmount ? 'completed' : data.down_payment > 0 ? 'partial' : 'pending',
        status: 'confirmed',
        notes: data.notes || null,
        terms_conditions: data.terms_conditions || null,
      });

      // Update lead status to 'booking_done' to move it out of the "ready for booking" section
      await updateAutoLead.mutateAsync({
        id: lead.id,
        status: 'booking_done',
      });

      toast({
        title: 'Booking created',
        description: `Booking has been created successfully for ${lead.name}.`,
      });

      onBooked?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Create booking error:', error);
      const description =
        error?.message || error?.error || JSON.stringify(error) || 'Failed to create booking. Please try again.';
      toast({
        title: 'Error creating booking',
        description,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Vehicle Booking</DialogTitle>
          <DialogDescription>
            Create a booking for this lead with pricing details and delivery information.
          </DialogDescription>
        </DialogHeader>

        {/* Lead Information Display */}
        {lead && (
          <div className="bg-secondary p-4 rounded-lg mb-4">
            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Lead Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{lead.name}</span>
              </div>
              {lead.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{lead.phone}</span>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{lead.email}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vehicle_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle *</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      // Auto-fill vehicle price when selected
                      const selectedVehicle = vehicles?.find(v => v.id === value);
                      if (selectedVehicle) {
                        form.setValue('vehicle_price', selectedVehicle.price);
                      }
                    }} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vehicle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(vehicles || []).map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.year} {vehicle.brand} {vehicle.model} {vehicle.variant && `(${vehicle.variant})`} - ₹{vehicle.price.toLocaleString()}
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
                name="booking_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Booking Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="delivery_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Delivery Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="delivery_location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter delivery address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="special_requests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Requests</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any special requirements or customizations"
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">Pricing Details</h4>

              <FormField
                control={form.control}
                name="vehicle_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Price (₹) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Base vehicle price"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="discount_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Amount (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accessories_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accessories Cost (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="registration_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="insurance_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Insurance (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="finance_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Finance Cost (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                name="down_payment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Down Payment (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-secondary p-4 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">Total Amount:</span>
                  <span className="text-lg font-bold text-primary">₹{totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">Down Payment:</span>
                  <span className="text-sm font-medium text-foreground">-₹{(watchedValues.down_payment || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-sm font-medium text-foreground">Remaining Balance:</span>
                  <span className="text-lg font-bold text-orange-600">₹{remainingBalance.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes for the booking"
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="terms_conditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Terms & Conditions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Booking terms and conditions"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createBooking.isPending} className="gradient-primary border-0">
                {createBooking.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Booking
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
