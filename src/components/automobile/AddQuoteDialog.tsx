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
import { useCreateQuote } from '@/hooks/useQuotes';
import { useAutoLeads } from '@/hooks/useAutoLeads';
import { useVehicles } from '@/hooks/useVehicles';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const quoteSchema = z.object({
  lead_id: z.string().uuid().optional(),
  vehicle_id: z.string().min(1, 'Vehicle is required'),
  quote_number: z.string().trim().max(50, 'Quote number must be less than 50 characters').optional().or(z.literal('')),
  vehicle_price: z.number().min(0, 'Vehicle price must be positive'),
  discount_amount: z.number().min(0, 'Discount cannot be negative').default(0),
  accessories_cost: z.number().min(0, 'Accessories cost cannot be negative').default(0),
  registration_cost: z.number().min(0, 'Registration cost cannot be negative').default(0),
  insurance_cost: z.number().min(0, 'Insurance cost cannot be negative').default(0),
  finance_cost: z.number().min(0, 'Finance cost cannot be negative').default(0),
  valid_until: z.string().optional(),
  notes: z.string().trim().max(1000, 'Notes must be less than 1000 characters').optional().or(z.literal('')),
  terms_conditions: z.string().trim().max(2000, 'Terms must be less than 2000 characters').optional().or(z.literal('')),
});

type QuoteFormData = z.infer<typeof quoteSchema>;

interface AddQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const quoteStatuses = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
];

export function AddQuoteDialog({ open, onOpenChange }: AddQuoteDialogProps) {
  const { toast } = useToast();
  const createQuote = useCreateQuote();
  const { data: leads } = useAutoLeads();
  const { data: vehicles } = useVehicles();

  const form = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      lead_id: undefined,
      vehicle_id: '',
      quote_number: '',
      vehicle_price: 0,
      discount_amount: 0,
      accessories_cost: 0,
      registration_cost: 0,
      insurance_cost: 0,
      finance_cost: 0,
      valid_until: '',
      notes: '',
      terms_conditions: '',
    },
  });

  // Calculate total amount
  const watchedValues = form.watch();
  const totalAmount =
    watchedValues.vehicle_price +
    watchedValues.accessories_cost +
    watchedValues.registration_cost +
    watchedValues.insurance_cost +
    watchedValues.finance_cost -
    watchedValues.discount_amount;

  const onSubmit = async (data: QuoteFormData) => {
    try {
      await createQuote.mutateAsync({
        lead_id: data.lead_id === 'none' ? null : data.lead_id || null,
        vehicle_id: data.vehicle_id,
        quote_number: data.quote_number || null,
        vehicle_price: data.vehicle_price,
        discount_amount: data.discount_amount,
        accessories_cost: data.accessories_cost,
        registration_cost: data.registration_cost,
        insurance_cost: data.insurance_cost,
        finance_cost: data.finance_cost,
        total_amount: totalAmount,
        status: 'draft',
        valid_until: data.valid_until || null,
        notes: data.notes || null,
        terms_conditions: data.terms_conditions || null,
      });

      toast({
        title: 'Quote created',
        description: `Quote has been created successfully with total amount ₹${totalAmount.toLocaleString()}.`,
      });

      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Create quote error:', error);
      const description =
        error?.message || error?.error || JSON.stringify(error) || 'Failed to create quote. Please try again.';
      toast({
        title: 'Error creating quote',
        description,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Quote</DialogTitle>
          <DialogDescription>
            Create a price quote for a vehicle. Fields marked with * are required.
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

            <FormField
              control={form.control}
              name="quote_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quote Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Auto-generated if empty" {...field} />
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

              <div className="bg-secondary p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">Total Amount:</span>
                  <span className="text-lg font-bold text-primary">₹{totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="valid_until"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valid Until</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes for the quote"
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
                      placeholder="Quote terms and conditions"
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
              <Button type="submit" disabled={createQuote.isPending} className="gradient-primary border-0">
                {createQuote.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Quote
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}