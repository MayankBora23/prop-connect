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
import { useCreateBooking } from '@/hooks/useBookings';
import { useCreateAutoLead } from '@/hooks/useAutoLeads';
import { useAutoLeads } from '@/hooks/useAutoLeads';
import { useVehicles } from '@/hooks/useVehicles';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const bookingSchema = z.object({
  lead_mode: z.enum(['existing', 'new']).default('existing'),
  lead_id: z.string().uuid().optional(),
  // New lead fields
  new_lead_name: z.string().trim().min(1, 'Lead name is required').max(100, 'Lead name must be less than 100 characters').optional(),
  new_lead_phone: z.string().trim().min(10, 'Phone must be at least 10 digits').max(15, 'Phone must be less than 15 digits').regex(/^[0-9+\-\s]+$/, 'Invalid phone number format').optional(),
  new_lead_email: z.string().email('Invalid email format').optional().or(z.literal('')),
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
}).refine((data) => {
  // If creating new lead, name and phone are required
  if (data.lead_mode === 'new' && (!data.new_lead_name?.trim() || !data.new_lead_phone?.trim())) {
    return false;
  }
  // For existing leads, lead_id is optional
  return true;
}, {
  message: "Please provide new lead details (name and phone required)",
  path: ["lead_mode"],
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface AddBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const bookingStatuses = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' },
];

export function AddBookingDialog({ open, onOpenChange }: AddBookingDialogProps) {
  const { toast } = useToast();
  const createBooking = useCreateBooking();
  const createAutoLead = useCreateAutoLead();
  const { data: leads } = useAutoLeads();
  const { data: vehicles } = useVehicles();

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      lead_mode: 'existing',
      lead_id: undefined,
      new_lead_name: '',
      new_lead_phone: '',
      new_lead_email: '',
      vehicle_id: '',
      booking_number: '',
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

  // Reset new lead fields when switching modes
  const leadMode = form.watch('lead_mode');
  useEffect(() => {
    if (leadMode === 'existing') {
      form.setValue('new_lead_name', '');
      form.setValue('new_lead_phone', '');
      form.setValue('new_lead_email', '');
    } else {
      form.setValue('lead_id', undefined);
    }
  }, [leadMode, form]);

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
    try {
      let leadId = data.lead_id;

      // Create new lead if in 'new' mode
      if (data.lead_mode === 'new') {
        const newLead = await createAutoLead.mutateAsync({
          name: data.new_lead_name!,
          phone: data.new_lead_phone!,
          email: data.new_lead_email || null,
          source: 'manual_booking',
          status: 'booking_done', // Mark as ready for booking since we're creating a booking
          financing_needed: false,
          insurance_needed: false,
          test_drive_requested: false,
          notes: [],
          tags: [],
        });
        leadId = newLead.id;
      }

      await createBooking.mutateAsync({
        lead_id: leadId || null,
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
        status: 'confirmed',
        notes: data.notes || null,
        terms_conditions: data.terms_conditions || null,
      });

      toast({
        title: 'Booking created',
        description: `Booking has been created successfully with total amount ₹${totalAmount.toLocaleString()}.`,
      });

      form.reset({
        lead_mode: 'existing',
        lead_id: undefined,
        new_lead_name: '',
        new_lead_phone: '',
        new_lead_email: '',
        vehicle_id: '',
        booking_number: '',
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
      });
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
      <DialogContent className="w-[95vw] max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Vehicle Booking</DialogTitle>
          <DialogDescription>
            Create a vehicle booking with pricing details and delivery information. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs value={leadMode} onValueChange={(value) => form.setValue('lead_mode', value as 'existing' | 'new')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing">Select Existing Lead</TabsTrigger>
                <TabsTrigger value="new">Create New Lead</TabsTrigger>
              </TabsList>

              <TabsContent value="existing" className="space-y-4">
                <FormField
                  control={form.control}
                  name="lead_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead (Optional)</FormLabel>
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
                        <FormLabel>Phone Number *</FormLabel>
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
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <div className="grid grid-cols-2 gap-4">
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
                      <Input placeholder="Auto-generated if empty" {...field} />
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
