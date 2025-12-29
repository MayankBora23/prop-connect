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
import { useCreateDeal } from '@/hooks/useDeals';
import { useAutoLeads } from '@/hooks/useAutoLeads';
import { useVehicles } from '@/hooks/useVehicles';
import { useBookings } from '@/hooks/useBookings';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const dealSchema = z.object({
  lead_id: z.string().min(1, 'Lead is required'),
  vehicle_id: z.string().min(1, 'Vehicle is required'),
  quote_id: z.string().uuid().optional(),
  deal_number: z.string().trim().max(50, 'Deal number must be less than 50 characters').optional().or(z.literal('')),
  final_price: z.number().min(0, 'Final price must be positive'),
  down_payment: z.number().min(0, 'Down payment cannot be negative').default(0),
  financed_amount: z.number().min(0, 'Financed amount cannot be negative').default(0),
  status: z.enum(['pending', 'approved', 'completed', 'cancelled']).default('pending'),
  delivery_date: z.string().optional(),
  payment_terms: z.string().trim().max(500, 'Payment terms must be less than 500 characters').optional().or(z.literal('')),
  special_conditions: z.string().trim().max(1000, 'Special conditions must be less than 1000 characters').optional().or(z.literal('')),
});

type DealFormData = z.infer<typeof dealSchema>;

interface AddDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const dealStatuses = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function AddDealDialog({ open, onOpenChange }: AddDealDialogProps) {
  const { toast } = useToast();
  const createDeal = useCreateDeal();
  const { data: leads } = useAutoLeads();
  const { data: vehicles } = useVehicles();
  const { data: bookings } = useBookings();

  const form = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      lead_id: '',
      vehicle_id: '',
      quote_id: undefined,
      deal_number: '',
      final_price: 0,
      down_payment: 0,
      financed_amount: 0,
      status: 'pending',
      delivery_date: '',
      payment_terms: '',
      special_conditions: '',
    },
  });

  const selectedLeadId = form.watch('lead_id');
  const selectedVehicleId = form.watch('vehicle_id');

  // Filter bookings based on selected lead and vehicle
  const relevantBookings = (bookings || []).filter(booking =>
    (!selectedLeadId || booking.lead_id === selectedLeadId) &&
    (!selectedVehicleId || booking.vehicle_id === selectedVehicleId)
  );

  // Auto-fill final price when booking is selected
  const selectedBookingId = form.watch('quote_id');
  const selectedBooking = relevantBookings.find(b => b.id === selectedBookingId);
  const finalPrice = form.watch('final_price');

  // Calculate financed amount
  const financedAmount = Math.max(0, (finalPrice || selectedBooking?.total_amount || 0) - (form.watch('down_payment') || 0));

  const onSubmit = async (data: DealFormData) => {
    try {
      await createDeal.mutateAsync({
        lead_id: data.lead_id,
        vehicle_id: data.vehicle_id,
        quote_id: data.quote_id === 'none' ? null : data.quote_id || null,
        deal_number: data.deal_number || null,
        final_price: data.final_price,
        down_payment: data.down_payment,
        financed_amount: financedAmount,
        status: data.status,
        delivery_date: data.delivery_date || null,
        payment_terms: data.payment_terms || null,
        special_conditions: data.special_conditions || null,
      });

      toast({
        title: 'Deal created',
        description: `Deal has been created successfully.`,
      });

      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Create deal error:', error);
      const description =
        error?.message || error?.error || JSON.stringify(error) || 'Failed to create deal. Please try again.';
      toast({
        title: 'Error creating deal',
        description,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Deal</DialogTitle>
          <DialogDescription>
            Create a new vehicle deal. Fields marked with * are required.
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
                    <FormLabel>Lead *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select lead" />
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
                            {vehicle.year} {vehicle.brand} {vehicle.model} {vehicle.variant && `(${vehicle.variant})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="quote_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Booking (Optional)</FormLabel>
                  <Select onValueChange={(value) => {
                    field.onChange(value);
                    const booking = relevantBookings.find(b => b.id === value);
                    if (booking) {
                      form.setValue('final_price', booking.total_amount);
                    }
                  }} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select booking (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No booking selected</SelectItem>
                      {relevantBookings.map((booking) => (
                        <SelectItem key={booking.id} value={booking.id}>
                          {booking.booking_number || `Booking ${booking.id.slice(-6)}`} - ₹{booking.total_amount.toLocaleString()}
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
                name="deal_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deal Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Auto-generated if empty" {...field} />
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
                        {dealStatuses.map((status) => (
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

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">Financial Details</h4>

              <FormField
                control={form.control}
                name="final_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Final Price (₹) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Final agreed price"
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

                <div className="bg-secondary p-3 rounded-lg">
                  <div className="text-sm text-muted-foreground">Financed Amount</div>
                  <div className="text-lg font-semibold text-primary">₹{financedAmount.toLocaleString()}</div>
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="delivery_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_terms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Terms</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Payment schedule and terms"
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
              name="special_conditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Conditions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any special conditions or notes"
                      className="min-h-[60px]"
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
              <Button type="submit" disabled={createDeal.isPending} className="gradient-primary border-0">
                {createDeal.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Deal
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}