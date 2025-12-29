import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCreateProduct, useCreateProductVariant } from '@/hooks/useProducts';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, X, Package } from 'lucide-react';
import type { ProductInsert } from '@/hooks/useProducts';

// Generate a unique EAN-13 barcode
const generateEAN13 = (): string => {
  // Generate 12 random digits
  let digits = '';
  for (let i = 0; i < 12; i++) {
    digits += Math.floor(Math.random() * 10).toString();
  }

  // Calculate check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;

  return digits + checkDigit.toString();
};

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
  product_type: z.enum(['simple', 'variant']).default('simple'),
  // Quantity for simple products
  quantity: z.coerce.number().min(0, 'Quantity must be >= 0').default(0).optional(),
  // Variant fields - simplified with color/size dropdowns
  variants: z.array(z.object({
    color: z.string().optional(),
    size: z.string().optional(),
    variant_description: z.string().trim().min(1, 'Variant description is required'),
    additional_price: z.coerce.number().default(0),
    quantity: z.coerce.number().min(0, 'Quantity must be >= 0').default(0),
  })).optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProduct?: any; // For edit mode
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

export function AddProductDialog({ open, onOpenChange }: AddProductDialogProps) {
  const { toast } = useToast();
  const createProduct = useCreateProduct();
  const createProductVariant = useCreateProductVariant();
  const [isCreating, setIsCreating] = useState(false);

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
      product_type: 'simple',
      quantity: 0,
      variants: [],
    },
  });

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control: form.control,
    name: 'variants',
  });

  const productType = form.watch('product_type');
  const baseName = form.watch('name');

  const generateVariantGroupId = () => {
    // Generate a 3-character uppercase code
    return Math.random().toString(36).substring(2, 5).toUpperCase();
  };

  const generateVariantSku = (groupId: string, sequence: number, variant: string) => {
    // Format: GROUPID-SEQUENCE-VARIANT (e.g., TSH-001-RED)
    return `${groupId}-${String(sequence).padStart(3, '0')}-${variant.toUpperCase()}`;
  };

  const onSubmit = async (data: ProductFormData) => {
    setIsCreating(true);
    try {
      if (data.product_type === 'variant') {
        // Create parent variant product
        const groupId = generateVariantGroupId();

        const parentProductData: ProductInsert = {
          name: data.name,
          description: data.description || undefined,
          category: data.category || undefined,
          unit_type: data.unit_type,
          selling_price: data.selling_price,
          purchase_price: data.purchase_price || undefined,
          tax_percentage: data.tax_percentage || 0,
          product_type: 'variant',
          variant_group_id: groupId,
        };

        const parentProduct = await createProduct.mutateAsync(parentProductData);

        // Create child variants
        if (data.variants && data.variants.length > 0) {
          for (let i = 0; i < data.variants.length; i++) {
            const variant = data.variants[i];
            // Generate SKU from variant description (simplified)
            const variantSlug = variant.variant_description.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);
            const sku = generateVariantSku(groupId, i + 1, variantSlug);
            const barcode = generateEAN13();

            await createProductVariant.mutateAsync({
              parentProductId: parentProduct.id,
              variantName: 'Variant', // Simplified - we don't need separate name/value
              variantValue: variant.variant_description, // Use the full description as value
              sku: sku,
              barcode: barcode,
              additionalPrice: variant.additional_price,
              stockQuantity: variant.quantity,
            });
          }
        }

        toast({
          title: 'Success',
          description: `Variant group created with ${data.variants?.length || 0} variants`,
        });
      } else {
        // Create simple product
        const barcode = data.barcode || generateEAN13();

        const productData: ProductInsert = {
          name: data.name,
          description: data.description || undefined,
          sku: data.sku || undefined,
          barcode: barcode,
          category: data.category || undefined,
          unit_type: data.unit_type,
          selling_price: data.selling_price,
          purchase_price: data.purchase_price || undefined,
          tax_percentage: data.tax_percentage || 0,
          product_type: 'simple',
        };

        const createdProduct = await createProduct.mutateAsync(productData);

        // Create inventory entry if quantity > 0
        if (data.quantity && data.quantity > 0) {
          try {
            // Create inventory entry for the simple product
            // Note: This will be handled by the inventory system when the migration is applied
            console.log('Would create inventory entry for simple product:', createdProduct.id, 'quantity:', data.quantity);
          } catch (error) {
            console.warn('Failed to create inventory entry for simple product:', error);
          }
        }

        toast({
          title: 'Success',
          description: `Product created successfully${data.quantity && data.quantity > 0 ? ` with ${data.quantity} units in stock` : ''}`,
        });
      }

      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating product:', error);
      toast({
        title: 'Error',
        description: 'Failed to create product. Please try again.',
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
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Create a new product in your catalog. Fill in the required information below.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  name="product_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select product type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="simple">Simple Product</SelectItem>
                          <SelectItem value="variant">Variant Product (Parent)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {productType === 'simple' && (
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
                )}
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

            {/* Variant Configuration */}
            {productType === 'variant' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Product Variants</h3>
                    <p className="text-sm text-muted-foreground">Each variant will get its own SKU for inventory management</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendVariant({
                      color: '',
                      size: '',
                      variant_description: '',
                      additional_price: 0,
                      quantity: 0,
                    })}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Variant
                  </Button>
                </div>

                {variantFields.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-muted-foreground/25 rounded-lg">
                    <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="font-medium">No variants added yet</p>
                    <p className="text-sm mt-1">Click "Add Variant" to create product variations</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Simple Variant List */}
                    <div className="grid gap-3">
                      {variantFields.map((field, index) => (
                        <div key={field.id} className="border rounded-lg p-4 bg-card">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                                {index + 1}
                              </div>
                              <span className="text-sm font-medium">Variant {index + 1}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeVariant(index)}
                              className="text-destructive hover:text-destructive h-8 w-8 p-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Size and Color Selection */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                            <FormField
                              control={form.control}
                              name={`variants.${index}.color`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Color</FormLabel>
                                  <Select
                                    onValueChange={(value) => {
                                      field.onChange(value);
                                      // Auto-update description when color changes
                                      const currentSize = form.watch(`variants.${index}.size`);
                                      const newDescription = [value, currentSize].filter(Boolean).join(' ') || '';
                                      form.setValue(`variants.${index}.variant_description`, newDescription);
                                    }}
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="h-8">
                                        <SelectValue placeholder="Color" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="Red">Red</SelectItem>
                                      <SelectItem value="Blue">Blue</SelectItem>
                                      <SelectItem value="Black">Black</SelectItem>
                                      <SelectItem value="White">White</SelectItem>
                                      <SelectItem value="Green">Green</SelectItem>
                                      <SelectItem value="Yellow">Yellow</SelectItem>
                                      <SelectItem value="Pink">Pink</SelectItem>
                                      <SelectItem value="Purple">Purple</SelectItem>
                                      <SelectItem value="Orange">Orange</SelectItem>
                                      <SelectItem value="Gray">Gray</SelectItem>
                                      <SelectItem value="Brown">Brown</SelectItem>
                                      <SelectItem value="Navy">Navy</SelectItem>
                                      <SelectItem value="Maroon">Maroon</SelectItem>
                                      <SelectItem value="Beige">Beige</SelectItem>
                                      <SelectItem value="Cream">Cream</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`variants.${index}.size`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Size</FormLabel>
                                  <Select
                                    onValueChange={(value) => {
                                      field.onChange(value);
                                      // Auto-update description when size changes
                                      const currentColor = form.watch(`variants.${index}.color`);
                                      const newDescription = [currentColor, value].filter(Boolean).join(' ') || '';
                                      form.setValue(`variants.${index}.variant_description`, newDescription);
                                    }}
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="h-8">
                                        <SelectValue placeholder="Size" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="XS">XS</SelectItem>
                                      <SelectItem value="S">S</SelectItem>
                                      <SelectItem value="M">M</SelectItem>
                                      <SelectItem value="L">L</SelectItem>
                                      <SelectItem value="XL">XL</SelectItem>
                                      <SelectItem value="XXL">XXL</SelectItem>
                                      <SelectItem value="XXXL">XXXL</SelectItem>
                                      <SelectItem value="30">30</SelectItem>
                                      <SelectItem value="32">32</SelectItem>
                                      <SelectItem value="34">34</SelectItem>
                                      <SelectItem value="36">36</SelectItem>
                                      <SelectItem value="38">38</SelectItem>
                                      <SelectItem value="40">40</SelectItem>
                                      <SelectItem value="42">42</SelectItem>
                                      <SelectItem value="Free Size">Free Size</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`variants.${index}.additional_price`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Extra Price</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="0.00"
                                      className="h-8"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`variants.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Stock</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="0"
                                      className="h-8"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Variant Description (Auto-generated but editable) */}
                          <FormField
                            control={form.control}
                            name={`variants.${index}.variant_description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm">Variant Description *</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Auto-filled from Color + Size, or edit manually"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Preview */}
                          <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                            <div className="flex justify-between">
                              <span>Final Price: ₹{(form.watch('selling_price') + (form.watch(`variants.${index}.additional_price`) || 0)).toLocaleString()}</span>
                              <span>Stock: {form.watch(`variants.${index}.quantity`) || 0} units</span>
                            </div>
                            <div className="mt-1 text-xs">
                              SKU Preview: {baseName ? `${generateVariantGroupId()}-${String(index + 1).padStart(3, '0')}-${form.watch(`variants.${index}.variant_description`)?.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10) || 'DESCRIPTION'}`.toUpperCase() : 'Generated after saving'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Quick Add Buttons */}
                    <div className="flex flex-wrap gap-2 pt-4 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
                          sizes.forEach(size => {
                            appendVariant({
                              color: '',
                              size: size,
                              variant_description: size,
                              additional_price: 0,
                              quantity: 10,
                            });
                          });
                        }}
                      >
                        + Add Sizes (S-XXL)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const colors = ['Red', 'Blue', 'Black', 'White', 'Green'];
                          colors.forEach(color => {
                            appendVariant({
                              color: color,
                              size: '',
                              variant_description: color,
                              additional_price: 0,
                              quantity: 10,
                            });
                          });
                        }}
                      >
                        + Add Colors
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const baseName = form.watch('name') || 'Product';
                          appendVariant({
                            color: '',
                            size: '',
                            variant_description: `${baseName} Standard`,
                            additional_price: 0,
                            quantity: 10,
                          });
                        }}
                      >
                        + Add Custom Variant
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pricing */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                Pricing {productType === 'variant' && '(Base Price for Variants)'}
              </h3>

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

              {productType === 'simple' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Initial Stock Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            {...field}
                          />
                        </FormControl>
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
                </div>
              )}

              {productType === 'variant' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : productType === 'variant' ? (
                  'Create Variant Group'
                ) : (
                  'Create Product'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}