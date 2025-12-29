import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCreateDiscount } from '@/hooks/useDiscounts';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { DiscountInsert } from '@/hooks/useDiscounts';

const discountSchema = z.object({
  name: z.string().trim().min(1, 'Discount name is required').max(255, 'Name must be less than 255 characters'),
  description: z.string().trim().max(1000, 'Description must be less than 1000 characters').optional().or(z.literal('')),
  discount_type: z.enum(['percentage', 'fixed_amount']).default('percentage'),
  discount_value: z.coerce.number().min(0, 'Discount value must be greater than or equal to 0'),
  minimum_purchase: z.coerce.number().min(0, 'Minimum purchase must be greater than or equal to 0').optional(),
  maximum_discount: z.coerce.number().min(0, 'Maximum discount must be greater than or equal to 0').optional(),
  is_active: z.boolean().default(true),
  valid_from: z.string().optional(),
  valid_until: z.string().optional(),
  usage_limit: z.coerce.number().min(0, 'Usage limit must be greater than or equal to 0').optional(),
  coupon_code: z.string().trim().max(50, 'Coupon code must be less than 50 characters').optional().or(z.literal('')),
}).refine((data) => {
  if (data.discount_type === 'percentage' && data.discount_value > 100) {
    return false;
  }
  return true;
}, {
  message: 'Percentage discount cannot exceed 100%',
  path: ['discount_value'],
});

type DiscountFormData = z.infer<typeof discountSchema>;

interface AddDiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const discountTypes = [
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'fixed_amount', label: 'Fixed Amount (₹)' }
];

export function AddDiscountDialog({ open, onOpenChange }: AddDiscountDialogProps) {
  const { toast } = useToast();
  const createDiscount = useCreateDiscount();

  const form = useForm<DiscountFormData>({
    resolver: zodResolver(discountSchema),
    defaultValues: {
      name: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      minimum_purchase: 0,
      maximum_discount: 0,
      is_active: true,
      valid_from: '',
      valid_until: '',
      usage_limit: 0,
      coupon_code: '',
    },
  });

  const discountType = form.watch('discount_type');

  const onSubmit = async (data: DiscountFormData) => {
    try {
      const discountData: DiscountInsert = {
        name: data.name,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        description: data.description || undefined,
        minimum_purchase: data.minimum_purchase || undefined,
        maximum_discount: data.maximum_discount || undefined,
        is_active: data.is_active,
        valid_from: data.valid_from ? new Date(data.valid_from).toISOString() : undefined,
        valid_until: data.valid_until ? new Date(data.valid_until).toISOString() : undefined,
        usage_limit: data.usage_limit || undefined,
        coupon_code: data.coupon_code || undefined,
        applicable_products: [],
        applicable_categories: [],
      };

      await createDiscount.mutateAsync(discountData);

      toast({
        title: 'Success',
        description: 'Discount created successfully',
      });

      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create discount. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Discount</DialogTitle>
          <DialogDescription>
            Create a new discount or coupon code for your store.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter discount name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="coupon_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coupon Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter coupon code (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter discount description"
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

            {/* Discount Rules */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Discount Rules</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="discount_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select discount type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {discountTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
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
                  name="discount_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Discount Value * {discountType === 'percentage' ? '(%)' : '(₹)'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step={discountType === 'percentage' ? '1' : '0.01'}
                          placeholder={discountType === 'percentage' ? '10' : '100.00'}
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
                  name="minimum_purchase"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Purchase (₹)</FormLabel>
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

                <FormField
                  control={form.control}
                  name="maximum_discount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Discount (₹)</FormLabel>
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

            {/* Validity & Usage */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Validity & Usage</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="valid_from"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valid From</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="valid_until"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valid Until</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="usage_limit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usage Limit</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Unlimited"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Discount</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          This discount is currently active
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createDiscount.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createDiscount.isPending}>
                {createDiscount.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Discount'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
