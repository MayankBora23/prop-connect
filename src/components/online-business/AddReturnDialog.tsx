import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCreateReturn } from '@/hooks/useReturns';
import { useSalesOrders } from '@/hooks/useSalesOrders';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { ReturnInsert } from '@/hooks/useReturns';

const returnSchema = z.object({
  order_id: z.string().uuid('Please select a valid order'),
  return_date: z.string().min(1, 'Return date is required'),
  status: z.enum(['requested', 'approved', 'received', 'refunded', 'rejected']).default('requested'),
  return_reason: z.string().trim().max(500, 'Return reason must be less than 500 characters').optional().or(z.literal('')),
  refund_amount: z.coerce.number().min(0, 'Refund amount must be greater than or equal to 0').optional(),
  refund_status: z.enum(['pending', 'completed', 'failed', 'refunded']).default('pending'),
  notes: z.string().trim().max(1000, 'Notes must be less than 1000 characters').optional().or(z.literal('')),
});

type ReturnFormData = z.infer<typeof returnSchema>;

interface AddReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const returnStatuses = [
  { value: 'requested', label: 'Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'received', label: 'Received' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'rejected', label: 'Rejected' }
];

const refundStatuses = [
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' }
];

export function AddReturnDialog({ open, onOpenChange }: AddReturnDialogProps) {
  const { toast } = useToast();
  const createReturn = useCreateReturn();
  const { data: orders, isLoading: ordersLoading } = useSalesOrders();

  const form = useForm<ReturnFormData>({
    resolver: zodResolver(returnSchema),
    defaultValues: {
      order_id: '',
      return_date: new Date().toISOString().split('T')[0],
      status: 'requested',
      return_reason: '',
      refund_amount: 0,
      refund_status: 'pending',
      notes: '',
    },
  });

  const onSubmit = async (data: ReturnFormData) => {
    try {
      const returnData = {
        ...data,
        return_date: new Date(data.return_date).toISOString(),
        return_reason: data.return_reason || undefined,
        refund_amount: data.refund_amount || undefined,
        notes: data.notes || undefined,
        return_items: [],
      } as any;

      await createReturn.mutateAsync(returnData as any);

      toast({
        title: 'Success',
        description: 'Return request created successfully',
      });

      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create return request. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Process Return</DialogTitle>
          <DialogDescription>
            Create a return request for an order. Fill in the return details below.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Return Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Return Information</h3>

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
                            ((orders || []) as any[]).map((order: any) => (
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
                  name="return_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Return Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Return Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select return status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {returnStatuses.map((status) => (
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

                <FormField
                  control={form.control}
                  name="refund_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Refund Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select refund status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {refundStatuses.map((status) => (
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

              <FormField
                control={form.control}
                name="return_reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Return Reason</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter the reason for return"
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="refund_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Refund Amount (₹)</FormLabel>
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
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Additional Information</h3>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional notes about this return"
                        className="resize-none"
                        rows={3}
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
                disabled={createReturn.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createReturn.isPending}>
                {createReturn.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Return'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
