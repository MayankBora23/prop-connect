import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCreatePayment } from '@/hooks/usePayments';
import { useSalesOrders } from '@/hooks/useSalesOrders';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { PaymentInsert } from '@/hooks/usePayments';

const paymentSchema = z.object({
  order_id: z.string().uuid('Please select a valid order'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  payment_method: z.enum(['cash', 'card', 'upi', 'net_banking', 'wallet', 'cod']),
  payment_status: z.enum(['pending', 'completed', 'failed', 'refunded']).default('completed'),
  transaction_id: z.string().trim().max(255, 'Transaction ID must be less than 255 characters').optional().or(z.literal('')),
  payment_gateway: z.string().trim().max(100, 'Payment gateway must be less than 100 characters').optional().or(z.literal('')),
  payment_date: z.string().optional(),
  failure_reason: z.string().trim().max(500, 'Failure reason must be less than 500 characters').optional().or(z.literal('')),
  notes: z.string().trim().max(1000, 'Notes must be less than 1000 characters').optional().or(z.literal('')),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'net_banking', label: 'Net Banking' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'cod', label: 'Cash on Delivery' }
];

const paymentStatuses = [
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' }
];

export function AddPaymentDialog({ open, onOpenChange }: AddPaymentDialogProps) {
  const { toast } = useToast();
  const createPayment = useCreatePayment();
  const { data: orders, isLoading: ordersLoading } = useSalesOrders();

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      order_id: '',
      amount: 0,
      payment_method: 'card',
      payment_status: 'completed',
      transaction_id: '',
      payment_gateway: '',
      payment_date: new Date().toISOString().split('T')[0],
      failure_reason: '',
      notes: '',
    },
  });

  const onSubmit = async (data: PaymentFormData) => {
    try {
      const paymentData: PaymentInsert = {
        ...data,
        payment_date: data.payment_date ? new Date(data.payment_date).toISOString() : undefined,
        transaction_id: data.transaction_id || undefined,
        payment_gateway: data.payment_gateway || undefined,
        failure_reason: data.failure_reason || undefined,
        notes: data.notes || undefined,
      };

      await createPayment.mutateAsync(paymentData);

      toast({
        title: 'Success',
        description: 'Payment recorded successfully',
      });

      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to record payment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a payment for an order. Fill in the payment details below.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Payment Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Payment Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="order_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select order" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ordersLoading ? (
                            <SelectItem value="" disabled>Loading orders...</SelectItem>
                          ) : (
                            (orders || []).map((order) => (
                              <SelectItem key={order.id} value={order.id}>
                                {order.order_number || `ORD-${order.id.slice(-6)}`} - ₹{order.total_amount.toLocaleString()}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="payment_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {paymentMethods.map((method) => (
                            <SelectItem key={method.value} value={method.value}>
                              {method.label}
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
                  name="payment_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {paymentStatuses.map((status) => (
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
            </div>

            {/* Transaction Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Transaction Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="transaction_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transaction ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter transaction ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payment_gateway"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Gateway</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Razorpay, Stripe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="payment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="failure_reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Failure Reason (if applicable)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter failure reason if payment failed"
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
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
                        placeholder="Add any additional notes about this payment"
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createPayment.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createPayment.isPending}>
                {createPayment.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Recording...
                  </>
                ) : (
                  'Record Payment'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
