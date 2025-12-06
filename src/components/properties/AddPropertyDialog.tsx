import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateProperty } from '@/hooks/useProperties';
import { useToast } from '@/hooks/use-toast';
import { Building2, Loader2 } from 'lucide-react';

const propertySchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  location: z.string().min(1, 'Location is required').max(200),
  bhk: z.string().min(1, 'BHK is required'),
  area: z.string().min(1, 'Area is required'),
  price: z.string().min(1, 'Price is required'),
  description: z.string().max(1000).optional(),
  status: z.enum(['available', 'sold', 'upcoming']),
});

type PropertyFormData = z.infer<typeof propertySchema>;

interface AddPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPropertyDialog({ open, onOpenChange }: AddPropertyDialogProps) {
  const { toast } = useToast();
  const createProperty = useCreateProperty();

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      status: 'available',
    },
  });

  const onSubmit = async (data: PropertyFormData) => {
    try {
      await createProperty.mutateAsync({
        title: data.title,
        location: data.location,
        bhk: data.bhk,
        area: data.area,
        price: data.price,
        description: data.description || null,
        status: data.status,
        images: [],
      });
      toast({
        title: 'Property Added',
        description: 'Property has been added successfully.',
      });
      reset();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add property.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Add New Property
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="title">Property Title *</Label>
              <Input id="title" {...register('title')} placeholder="e.g., Sunrise Heights" />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input id="location" {...register('location')} placeholder="e.g., Whitefield, Bangalore" />
              {errors.location && <p className="text-xs text-destructive">{errors.location.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bhk">BHK Type *</Label>
              <Select onValueChange={(value) => setValue('bhk', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select BHK" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1 BHK">1 BHK</SelectItem>
                  <SelectItem value="2 BHK">2 BHK</SelectItem>
                  <SelectItem value="3 BHK">3 BHK</SelectItem>
                  <SelectItem value="4 BHK">4 BHK</SelectItem>
                  <SelectItem value="4+ BHK">4+ BHK</SelectItem>
                  <SelectItem value="Villa">Villa</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
              {errors.bhk && <p className="text-xs text-destructive">{errors.bhk.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">Area *</Label>
              <Input id="area" {...register('area')} placeholder="e.g., 1200 sq.ft" />
              {errors.area && <p className="text-xs text-destructive">{errors.area.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
              <Input id="price" {...register('price')} placeholder="e.g., ₹50L - ₹75L" />
              {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select defaultValue="available" onValueChange={(value: 'available' | 'sold' | 'upcoming') => setValue('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register('description')} placeholder="Property description..." rows={3} />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 gradient-primary border-0" disabled={createProperty.isPending}>
              {createProperty.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Property
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
