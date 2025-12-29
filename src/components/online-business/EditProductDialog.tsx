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
import { useUpdateProduct } from '@/hooks/useProducts';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { ProductUpdate } from '@/hooks/useProducts';

const productSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(255, 'Name must be less than 255 characters'),
  description: z.string().trim().max(1000, 'Description must be less than 1000 characters').optional().or(z.literal('')),
  sku: z.string().trim().max(100, 'SKU must be less than 100 characters').optional().or(z.literal('')),
  barcode: z.string().trim().max(100, 'Barcode must be less than 100 characters').optional().or(z.literal('')),
  category: z.string().trim().max(100, 'Category must be less than 100 characters').optional().or(z.literal('')),
  unit_type: z.string().trim().min(1, 'Unit type is required'),
  selling_price: z.coerce.number().min(0, 'Selling price must be greater than or equal to 0'),
  purchase_price: z.coerce.number().min(0, 'Purchase price must be greater than or equal to 0').optional(),
  tax_percentage: z.coerce.number().min(0, 'Tax percentage must be greater than or equal to 0').max(100, 'Tax percentage cannot exceed 100').default(0),
});

type ProductFormData = z.infer<typeof productSchema>;

interface EditProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any; // The product being edited
}

const categories = [
  'Retail',
  'Fashion',
  'Grocery',
  'Healthcare',
  'Hardware',
  'Electronics',
  'Food & Beverage',
  'Home & Garden',
  'Sports & Recreation',
  'Office Supplies',
  'Industrial',
  'Services',
  'Other'
];

const unitTypes = [
  'piece',
  'box',
  'pack',
  'kg',
  'gram',
  'liter',
  'ml',
  'meter',
  'feet',
  'inch',
  'dozen',
  'pair',
  'set',
  'bundle'
];

export function EditProductDialog({ open, onOpenChange, product }: EditProductDialogProps) {
  const { toast } = useToast();
  const updateProduct = useUpdateProduct();

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      sku: '',
      barcode: '',
      category: '',
      unit_type: 'piece',
      selling_price: 0,
      purchase_price: 0,
      tax_percentage: 0,
    },
  });

  // Populate form when product changes
  useEffect(() => {
    if (product && open) {
      form.reset({
        name: product.name || '',
        description: product.description || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        category: product.category || '',
        unit_type: product.unit_type || 'piece',
        selling_price: product.selling_price || 0,
        purchase_price: product.purchase_price || 0,
        tax_percentage: product.tax_percentage || 0,
      });
    }
  }, [product, open, form]);

  const onSubmit = async (data: ProductFormData) => {
    try {
      const productData: ProductUpdate = {
        name: data.name,
        description: data.description || undefined,
        sku: data.sku || undefined,
        barcode: data.barcode || undefined,
        category: data.category || undefined,
        unit_type: data.unit_type,
        selling_price: data.selling_price,
        purchase_price: data.purchase_price || undefined,
        tax_percentage: data.tax_percentage || 0,
      };

      await updateProduct.mutateAsync({ id: product.id, ...productData });

      toast({
        title: 'Success',
        description: 'Product updated successfully',
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: 'Error',
        description: 'Failed to update product. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update product details. Stock levels are managed separately in the Inventory section by SKU.
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
                      <FormLabel>Product Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter product name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU / Product Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter SKU or product code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
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
                  name="unit_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {unitTypes.map((unitType) => (
                            <SelectItem key={unitType} value={unitType}>
                              {unitType}
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
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Barcode</FormLabel>
                      <FormControl>
                        <Input placeholder="Auto-generated or enter manually" {...field} />
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
                        placeholder="Short description of the product"
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

            {/* Pricing */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Pricing</h3>
              <p className="text-sm text-muted-foreground">
                Stock levels are managed separately by SKU in the Inventory section
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="selling_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Selling Price *</FormLabel>
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
                  name="purchase_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Price</FormLabel>
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
                  name="tax_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax / GST %</FormLabel>
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

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateProduct.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateProduct.isPending}>
                {updateProduct.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Product'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
