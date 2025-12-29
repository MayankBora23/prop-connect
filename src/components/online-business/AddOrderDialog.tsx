import { useForm, useFieldArray } from 'react-hook-form';
import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCreateSalesOrder } from '@/hooks/useSalesOrders';
import { useOnlineCustomers, OnlineCustomer } from '@/hooks/useOnlineCustomers';
import { useInventory } from '@/hooks/useInventory';
import { useProducts } from '@/hooks/useProducts';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, X, Search, Package, AlertTriangle } from 'lucide-react';
import type { SalesOrderInsert } from '@/hooks/useSalesOrders';

const orderSchema = z.object({
  customer_id: z.string().uuid('Please select a valid customer'),
  order_date: z.string().min(1, 'Order date is required'),
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']).default('pending'),
  payment_method: z.enum(['cash', 'card', 'upi', 'net_banking', 'wallet', 'cod']).optional(),
  payment_status: z.enum(['pending', 'completed', 'failed', 'refunded']).default('pending'),
  shipping_address: z.string().trim().max(1000, 'Shipping address must be less than 1000 characters').optional().or(z.literal('')),
  billing_address: z.string().trim().max(1000, 'Billing address must be less than 1000 characters').optional().or(z.literal('')),
  notes: z.string().trim().max(1000, 'Notes must be less than 1000 characters').optional().or(z.literal('')),
  // Order items
  order_items: z.array(z.object({
    sku: z.string().min(1, 'SKU is required'),
    product_name: z.string().min(1, 'Product name is required'),
    quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
    unit_price: z.coerce.number().min(0, 'Unit price must be >= 0'),
    discount_amount: z.coerce.number().min(0, 'Discount must be >= 0').default(0),
  })).min(1, 'At least one item is required'),
  // Calculated fields
  subtotal: z.coerce.number().min(0).default(0),
  tax_amount: z.coerce.number().min(0).default(0),
  discount_amount: z.coerce.number().min(0).default(0),
  shipping_amount: z.coerce.number().min(0).default(0),
  total_amount: z.coerce.number().min(0).default(0),
}).refine((data) => {
  // Validate that total_amount equals the sum of all items
  const calculatedTotal = data.subtotal + data.tax_amount - data.discount_amount + data.shipping_amount;
  return Math.abs(data.total_amount - calculatedTotal) < 0.01; // Allow small floating point differences
}, {
  message: "Total amount doesn't match calculated amount",
  path: ["total_amount"],
});

type OrderFormData = z.infer<typeof orderSchema>;

interface AddOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const orderStatuses = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' }
];

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

export function AddOrderDialog({ open, onOpenChange }: AddOrderDialogProps) {
  const { toast } = useToast();
  const createOrder = useCreateSalesOrder();
  const { data: customers, isLoading: customersLoading } = useOnlineCustomers();
  const { data: inventory } = useInventory();
  const { data: products } = useProducts();
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customer_id: '',
      order_date: new Date().toISOString().split('T')[0],
      status: 'pending',
      payment_method: undefined,
      payment_status: 'pending',
      shipping_address: '',
      billing_address: '',
      notes: '',
      order_items: [],
      subtotal: 0,
      tax_amount: 0,
      discount_amount: 0,
      shipping_amount: 0,
      total_amount: 0,
    },
  });

  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control: form.control,
    name: 'order_items',
  });

  // Filter products based on search (use products with SKUs)
  const productsWithSkus = products?.filter(product => product.sku) || [];
  const filteredProducts = productsWithSkus.filter(product =>
    product.sku?.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.name?.toLowerCase().includes(productSearch.toLowerCase())
  ) || [];

  // Get price for a SKU from products data
  const getProductPrice = (sku: string): number => {
    const product = products?.find(p => p.sku === sku);
    return product?.selling_price || 0;
  };

  // Get product name for a SKU
  const getProductName = (sku: string): string => {
    const product = products?.find(p => p.sku === sku);
    return product?.name || 'Unknown Product';
  };

  // Calculate totals whenever items change
  const calculateTotals = () => {
    const items = form.getValues('order_items');
    // Use current product prices for accurate calculations
    const subtotal = items.reduce((sum, item) => {
      const currentPrice = getProductPrice(item.sku);
      return sum + (item.quantity * currentPrice);
    }, 0);
    const taxAmount = form.getValues('tax_amount') || 0;
    const discountAmount = form.getValues('discount_amount') || 0;
    const shippingAmount = form.getValues('shipping_amount') || 0;
    const total = subtotal + taxAmount - discountAmount + shippingAmount;

    form.setValue('subtotal', subtotal);
    form.setValue('total_amount', total);
  };

  // Add product to order
  const addProductToOrder = (product: any) => {
    const existingItemIndex = itemFields.findIndex(item => form.getValues(`order_items.${item.index}.sku`) === product.sku);

    if (existingItemIndex >= 0) {
      // Update existing item quantity
      const currentQty = form.getValues(`order_items.${existingItemIndex}.quantity`) || 0;
      form.setValue(`order_items.${existingItemIndex}.quantity`, currentQty + 1);
    } else {
      // Add new item with correct price from products data
      const unitPrice = product.selling_price || 0;
      appendItem({
        sku: product.sku,
        product_name: product.name || 'Unknown Product',
        quantity: 1,
        unit_price: unitPrice,
        discount_amount: 0,
      });
    }

    setProductSearch('');
    setSelectedProduct(null);
    calculateTotals();
  };

  // Update item quantity
  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(index);
    } else {
      form.setValue(`order_items.${index}.quantity`, quantity);
    }
    calculateTotals();
  };

  // Remove item from order
  const removeOrderItem = (index: number) => {
    removeItem(index);
    calculateTotals();
  };

  const watchedSubtotal = form.watch('subtotal');
  const watchedTax = form.watch('tax_amount');
  const watchedDiscount = form.watch('discount_amount');
  const watchedShipping = form.watch('shipping_amount');

  // Auto-calculate total when amounts change
  const calculatedTotal = (watchedSubtotal || 0) + (watchedTax || 0) - (watchedDiscount || 0) + (watchedShipping || 0);

  const onSubmit = async (data: OrderFormData) => {
    setIsCreating(true);
    try {
      // Create order with items
      const orderData: SalesOrderInsert & { order_items?: any[] } = {
        order_number: `ORD-${Date.now()}`,
        customer_id: data.customer_id,
        order_date: new Date(data.order_date).toISOString(),
        subtotal: data.subtotal,
        tax_amount: data.tax_amount,
        discount_amount: data.discount_amount,
        shipping_amount: data.shipping_amount,
        total_amount: data.total_amount,
        status: data.status,
        payment_method: data.payment_method || undefined,
        payment_status: data.payment_status,
        shipping_address: data.shipping_address || undefined,
        billing_address: data.billing_address || undefined,
        notes: data.notes || undefined,
        order_items: data.order_items.map(item => {
          const currentPrice = getProductPrice(item.sku); // Always get fresh price from products
          return {
            sku: item.sku,
            product_name: getProductName(item.sku), // Always get fresh name from products
            quantity: item.quantity,
            unit_price: currentPrice, // Use current product price
            discount_amount: item.discount_amount,
            total_price: item.quantity * currentPrice - item.discount_amount,
          };
        }),
      };

      await createOrder.mutateAsync(orderData);

      toast({
        title: 'Success',
        description: `Order created with ${data.order_items.length} item(s)`,
      });

      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Order creation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create order. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
          <DialogDescription>
            Create a new sales order with inventory tracking. Add products, set quantities, and confirm stock availability.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Customer & Order Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Order Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customersLoading ? (
                            <SelectItem value="" disabled>Loading customers...</SelectItem>
                          ) : (
                            ((customers || []) as any[]).map((customer: any) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.name} - {customer.phone}
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
                  name="order_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order Date *</FormLabel>
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
                      <FormLabel>Order Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {orderStatuses.map((status) => (
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

            {/* Financial Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Financial Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="subtotal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subtotal *</FormLabel>
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
                  name="tax_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Amount</FormLabel>
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
                  name="discount_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Amount</FormLabel>
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
                  name="shipping_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shipping Amount</FormLabel>
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
                <div className="p-4 bg-secondary rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground">Calculated Total</p>
                  <p className="text-2xl font-bold">₹{calculatedTotal.toFixed(2)}</p>
                </div>

                <FormField
                  control={form.control}
                  name="total_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Amount *</FormLabel>
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

            {/* Order Items */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Order Items</h3>

              {/* Product Search and Add */}
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Search products by SKU or name..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Product Search Results */}
                {productSearch && (
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        No products found
                      </div>
                    ) : (
                      filteredProducts.slice(0, 10).map((product) => {
                        const inventoryItem = inventory?.find(inv => inv.sku === product.sku);
                        const availableStock = inventoryItem?.available_stock || 0;

                        return (
                          <div
                            key={product.sku}
                            className="flex items-center justify-between p-3 hover:bg-secondary/50 cursor-pointer border-b last:border-b-0"
                            onClick={() => addProductToOrder(product)}
                          >
                            <div className="flex items-center gap-3">
                              <Package className="w-5 h-5 text-primary" />
                              <div>
                                <p className="font-medium text-sm">{product.name || 'Unknown Product'}</p>
                                <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">₹{product.selling_price || 0}</p>
                              <p className="text-xs text-muted-foreground">Stock: {availableStock}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Order Items List */}
                <div className="space-y-2">
                  {itemFields.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-muted-foreground/25 rounded-lg">
                      <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p>No items added yet</p>
                      <p className="text-sm">Search and add products above</p>
                    </div>
                  ) : (
                    itemFields.map((field, index) => {
                      const item = form.watch(`order_items.${index}`);
                      const availableStock = inventory?.find(inv => inv.sku === item.sku)?.available_stock || 0;
                      const productPrice = getProductPrice(item.sku);
                      const productName = getProductName(item.sku);

                      return (
                        <div key={field.id} className="flex items-center gap-4 p-4 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{productName}</p>
                            <p className="text-xs text-muted-foreground">SKU: {item.sku} | Unit Price: ₹{productPrice}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => updateItemQuantity(index, (item.quantity || 0) - 1)}
                              disabled={(item.quantity || 0) <= 1}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              min="1"
                              max={availableStock}
                              value={item.quantity || 0}
                              onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 0)}
                              className="w-16 text-center"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => updateItemQuantity(index, (item.quantity || 0) + 1)}
                              disabled={(item.quantity || 0) >= availableStock}
                            >
                              +
                            </Button>
                          </div>

                          <div className="text-right min-w-24">
                            <p className="text-sm font-medium">₹{(productPrice * item.quantity).toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">
                              @ ₹{productPrice} each
                            </p>
                            <p className={`text-xs ${availableStock < item.quantity ? 'text-red-600' : 'text-muted-foreground'}`}>
                              {availableStock < item.quantity ? (
                                <span className="flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Only {availableStock} in stock
                                </span>
                              ) : (
                                `${availableStock} available`
                              )}
                            </p>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOrderItem(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Payment & Additional Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Payment & Shipping</h3>

              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
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
            </div>

            {/* Addresses */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Addresses</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="shipping_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shipping Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter shipping address"
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billing_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter billing address"
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
            </div>

            {/* Notes */}
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
                        placeholder="Add any additional notes for this order"
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
                disabled={createOrder.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || itemFields.length === 0}>
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Order...
                  </>
                ) : (
                  'Create Order'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
