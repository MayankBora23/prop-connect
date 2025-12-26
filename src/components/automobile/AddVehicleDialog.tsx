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
import { useCreateVehicle } from '@/hooks/useVehicles';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const vehicleSchema = z.object({
  vehicle_type: z.enum(['car', 'bike'], { message: 'Vehicle type is required' }),
  brand: z.string().trim().min(1, 'Brand is required').max(100, 'Brand must be less than 100 characters'),
  model: z.string().trim().min(1, 'Model is required').max(100, 'Model must be less than 100 characters'),
  variant: z.string().trim().max(100, 'Variant must be less than 100 characters').optional().or(z.literal('')),
  year: z.number().min(1900, 'Year must be valid').max(new Date().getFullYear() + 1, 'Year cannot be in the future'),
  price: z.number().min(0, 'Price must be positive'),
  fuel_type: z.enum(['petrol', 'diesel', 'electric', 'hybrid', 'cng'], { message: 'Fuel type is required' }),
  transmission: z.enum(['manual', 'automatic', 'cvt', 'dct'], { message: 'Transmission type is required' }),
  mileage: z.number().min(0, 'Mileage must be positive').optional(),
  engine_capacity: z.string().trim().max(50, 'Engine capacity must be less than 50 characters').optional().or(z.literal('')),
  seating_capacity: z.number().min(1, 'Seating capacity must be at least 1').max(20, 'Seating capacity must be reasonable').optional(),
  color: z.string().trim().max(50, 'Color must be less than 50 characters').optional().or(z.literal('')),
  vin: z.string().trim().max(50, 'VIN must be less than 50 characters').optional().or(z.literal('')),
  stock_number: z.string().trim().max(50, 'Stock number must be less than 50 characters').optional().or(z.literal('')),
  description: z.string().trim().max(1000, 'Description must be less than 1000 characters').optional().or(z.literal('')),
  location: z.string().trim().max(200, 'Location must be less than 200 characters').optional().or(z.literal('')),
  status: z.enum(['available', 'sold', 'reserved', 'maintenance']).default('available'),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

interface AddVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const vehicleTypes = [
  { value: 'car', label: 'Car' },
  { value: 'bike', label: 'Bike' },
];

const fuelTypes = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'Electric' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'cng', label: 'CNG' },
];

const transmissionTypes = [
  { value: 'manual', label: 'Manual' },
  { value: 'automatic', label: 'Automatic' },
  { value: 'cvt', label: 'CVT' },
  { value: 'dct', label: 'DCT' },
];

const vehicleStatuses = [
  { value: 'available', label: 'Available' },
  { value: 'sold', label: 'Sold' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'maintenance', label: 'Maintenance' },
];

export function AddVehicleDialog({ open, onOpenChange }: AddVehicleDialogProps) {
  const { toast } = useToast();
  const createVehicle = useCreateVehicle();

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      vehicle_type: 'car',
      brand: '',
      model: '',
      variant: '',
      year: new Date().getFullYear(),
      price: 0,
      fuel_type: 'petrol',
      transmission: 'manual',
      mileage: undefined,
      engine_capacity: '',
      seating_capacity: undefined,
      color: '',
      vin: '',
      stock_number: '',
      description: '',
      location: '',
      status: 'available',
    },
  });

  const onSubmit = async (data: VehicleFormData) => {
    try {
      await createVehicle.mutateAsync({
        vehicle_type: data.vehicle_type,
        brand: data.brand,
        model: data.model,
        variant: data.variant || null,
        year: data.year,
        price: data.price,
        fuel_type: data.fuel_type,
        transmission: data.transmission,
        mileage: data.mileage,
        engine_capacity: data.engine_capacity || null,
        seating_capacity: data.seating_capacity,
        color: data.color || null,
        vin: data.vin || null,
        stock_number: data.stock_number || null,
        description: data.description || null,
        location: data.location || null,
        status: data.status,
        specifications: {},
      });

      toast({
        title: 'Vehicle added',
        description: `${data.year} ${data.brand} ${data.model} has been added successfully.`,
      });

      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Create vehicle error:', error);
      const description =
        error?.message || error?.error || JSON.stringify(error) || 'Failed to create vehicle. Please try again.';
      toast({
        title: 'Error creating vehicle',
        description,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Vehicle</DialogTitle>
          <DialogDescription>
            Fill in the vehicle details. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vehicle_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vehicle type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehicleTypes.map((type) => (
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
                        {vehicleStatuses.map((status) => (
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

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Toyota, Honda" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Camry, Civic" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="variant"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Variant</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., LE, EX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 2023"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (₹) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 1500000"
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fuel_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fuel Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select fuel type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {fuelTypes.map((fuel) => (
                          <SelectItem key={fuel.value} value={fuel.value}>
                            {fuel.label}
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
                name="transmission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transmission *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select transmission" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {transmissionTypes.map((trans) => (
                          <SelectItem key={trans.value} value={trans.value}>
                            {trans.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="mileage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mileage (km/l)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 18.5"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="engine_capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Engine Capacity</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 1.8L, 1500cc" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="seating_capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seating Capacity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 5"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., White, Black" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Showroom A, Warehouse" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>VIN</FormLabel>
                    <FormControl>
                      <Input placeholder="Vehicle Identification Number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stock_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Stock/Inventory Number" {...field} />
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
                      placeholder="Additional vehicle details, features, condition, etc."
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
              <Button type="submit" disabled={createVehicle.isPending} className="gradient-primary border-0">
                {createVehicle.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Vehicle
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}