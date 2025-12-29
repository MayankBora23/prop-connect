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
import { useUpdateBooking } from '@/hooks/useBookings';
import { useAutoLeads } from '@/hooks/useAutoLeads';
import { useVehicles } from '@/hooks/useVehicles';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { BookingWithRelations } from '@/hooks/useAutoTypes';

const bookingSchema = z.object({
  lead_id: z.string().uuid().optional(),
  vehicle_id: z.string().min(1, 'Vehicle is required'),
  booking_number: z.string().trim().max(50, 'Booking number must be less than 50 characters').optional().or(z.literal('')),
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

type BookingFormData = z.infer<typeof bookingSchema>;

interface EditBookingDialogProps {
  booking: BookingWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditBookingDialog({ booking, open, onOpenChange }: EditBookingDialogProps) {
  const { toast } = useToast();
  const updateBooking = useUpdateBooking();
  const { data: leads } = useAutoLeads();
  const { data: vehicles } = useVehicles();

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      lead_id: undefined,
      vehicle_id: '',
      booking_number: '',
      booking_date: '',
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

  // Populate form when booking changes
  useEffect(() => {
    if (booking) {
      form.reset({
        lead_id: booking.lead_id || undefined,
        vehicle_id: booking.vehicle_id,
        booking_number: booking.booking_number || '',
        booking_date: booking.booking_date || '',
        delivery_date: booking.delivery_date || '',
        delivery_location: booking.delivery_location || '',
        special_requests: booking.special_requests || '',
        vehicle_price: booking.vehicle_price,
        discount_amount: booking.discount_amount,
        accessories_cost: booking.accessories_cost,
        registration_cost: booking.registration_cost,
        insurance_cost: booking.insurance_cost,
        finance_cost: booking.finance_cost,
        down_payment: booking.down_payment,
        notes: booking.notes || '',
        terms_conditions: booking.terms_conditions || '',
      });
    }
  }, [booking, form]);

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

  const onSubmit = async (data: BookingFormData) => {
    if (!booking) return;

    try {
      await updateBooking.mutateAsync({
        id: booking.id,
        lead_id: data.lead_id === 'none' ? null : data.lead_id || null,
        vehicle_id: data.vehicle_id,
        booking_number: data.booking_number || null,
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
        notes: data.notes || null,
        terms_conditions: data.terms_conditions || null,
      });

      toast({
        title: 'Booking updated',
        description: `Booking has been updated successfully.`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Update booking error:', error);
      const description =
        error?.message || error?.error || JSON.stringify(error) || 'Failed to update booking. Please try again.';
      toast({
        title: 'Error updating booking',
        description,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Vehicle Booking</DialogTitle>
          <DialogDescription>
            Update booking details, pricing, and delivery information.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lead_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a lead" />
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="booking_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Booking Number</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
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
              <Button type="submit" disabled={updateBooking.isPending} className="gradient-primary border-0">
                {updateBooking.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Booking
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
