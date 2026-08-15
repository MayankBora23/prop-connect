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
  vehicle_type: z.enum(['car', 'bike', 'used_car', 'used_bike'], { message: 'Vehicle type is required' }),
  brand: z.string().trim().min(1, 'Brand is required').max(100, 'Brand must be less than 100 characters'),
  model: z.string().trim().min(1, 'Model is required').max(100, 'Model must be less than 100 characters'),
  variant: z.string().trim().max(100, 'Variant must be less than 100 characters').optional().or(z.literal('')),
  year: z.number().min(1900, 'Year must be valid').max(new Date().getFullYear() + 1, 'Year cannot be in the future'),
  price: z.number().min(0, 'Price must be positive'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  fuel_type: z.enum(['petrol', 'diesel', 'electric', 'hybrid', 'cng'], { message: 'Fuel type is required' }),
  transmission: z.enum(['manual', 'automatic', 'cvt', 'dct'], { message: 'Transmission type is required' }),
  mileage: z.number().min(0, 'Mileage must be positive').optional(),
  engine_capacity: z.string().trim().max(50, 'Engine capacity must be less than 50 characters').optional().or(z.literal('')),
  seating_capacity: z.number().min(1, 'Seating capacity must be at least 1').max(20, 'Seating capacity must be reasonable').optional(),
  color: z.string().trim().max(50, 'Color must be less than 50 characters').optional().or(z.literal('')),
  description: z.string().trim().max(1000, 'Description must be less than 1000 characters').optional().or(z.literal('')),
  location: z.string().trim().max(200, 'Location must be less than 200 characters').optional().or(z.literal('')),
  status: z.enum(['available', 'sold', 'reserved', 'maintenance']).default('available'),
  odometer_reading: z.number().min(0, 'Odometer reading must be positive').optional(),
  ownership_count: z.number().min(1, 'Ownership count must be at least 1').max(10, 'Ownership count seems unreasonable').optional(),
  rc_status: z.enum(['available', 'pending', 'missing']).optional(),
  insurance_status: z.enum(['valid', 'expired', 'pending', 'missing']).optional(),
}).refine((data) => {
  // For used vehicles, odometer_reading and ownership_count are required
  if (data.vehicle_type === 'used_car' || data.vehicle_type === 'used_bike') {
    return data.odometer_reading !== undefined && data.ownership_count !== undefined;
  }
  return true;
}, {
  message: "Odometer reading and ownership count are required for used vehicles",
  path: ["vehicle_type"], // This will show the error on the vehicle_type field
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

interface AddVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const vehicleTypes = [
  { value: 'car', label: 'Car' },
  { value: 'bike', label: 'Bike' },
  { value: 'used_car', label: 'Used Car' },
  { value: 'used_bike', label: 'Used Bike' },
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
      quantity: 1,
      fuel_type: 'petrol',
      transmission: 'manual',
      mileage: undefined,
      engine_capacity: '',
      seating_capacity: undefined,
      color: '',
      description: '',
      location: '',
      status: 'available',
      odometer_reading: undefined,
      ownership_count: undefined,
      rc_status: undefined,
      insurance_status: undefined,
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
        quantity: data.quantity,
        fuel_type: data.fuel_type,
        transmission: data.transmission,
        mileage: data.mileage,
        engine_capacity: data.engine_capacity || null,
        seating_capacity: data.seating_capacity,
        color: data.color || null,
        description: data.description || null,
        location: data.location || null,
        status: data.status,
        specifications: {},
        odometer_reading: data.odometer_reading,
        ownership_count: data.ownership_count,
        rc_status: data.rc_status,
        insurance_status: data.insurance_status,
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
      <DialogContent className="w-[95vw] max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Vehicle</DialogTitle>
          <DialogDescription>
            Fill in the vehicle details. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
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

            <div className="grid grid-cols-3 gap-4">
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

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 5"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
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

            {/* Used Vehicle Fields - conditionally rendered */}
            {(form.watch('vehicle_type') === 'used_car' || form.watch('vehicle_type') === 'used_bike') && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                <h4 className="font-medium text-foreground">Used Vehicle Details</h4>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="odometer_reading"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Odometer Reading (km) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 45000"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ownership_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ownership Count *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 2"
                            min="1"
                            max="10"
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

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="rc_status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RC Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select RC status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="missing">Missing</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="insurance_status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Insurance Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select insurance status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="valid">Valid</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="missing">Missing</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
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