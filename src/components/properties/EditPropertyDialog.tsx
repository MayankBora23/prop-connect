import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateProperty } from '@/hooks/useProperties';
import { useToast } from '@/hooks/use-toast';
import { Building2, Loader2 } from 'lucide-react';
import type { Property } from '@/hooks/useProperties';
import { ImageUpload } from '@/components/ui/image-upload';

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

interface EditPropertyDialogProps {
  property: Property | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPropertyDialog({ property, open, onOpenChange }: EditPropertyDialogProps) {
  const { toast } = useToast();
  const updateProperty = useUpdateProperty();

  const [images, setImages] = useState<string[]>(property?.images || []);

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      title: property?.title || '',
      location: property?.location || '',
      bhk: property?.bhk || '',
      area: property?.area || '',
      price: property?.price || '',
      description: property?.description || '',
      status: property?.status || 'available',
    },
  });

  // Update form values when property changes
  React.useEffect(() => {
    if (property) {
      form.reset({
        title: property.title,
        location: property.location,
        bhk: property.bhk,
        area: property.area,
        price: property.price,
        description: property.description || '',
        status: property.status,
      });
      setImages(property.images || []);
    }
  }, [property, form]);

  const onSubmit = async (data: PropertyFormData) => {
    if (!property) return;

    try {
      await updateProperty.mutateAsync({
        id: property.id,
        title: data.title,
        location: data.location,
        bhk: data.bhk,
        area: data.area,
        price: data.price,
        description: data.description,
        images: images,
        status: data.status,
      });

      toast({
        title: 'Property updated',
        description: `${data.title} has been updated successfully.`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Update property error:', error);
      const description =
        error?.message || error?.error || JSON.stringify(error) || 'Failed to update property. Please try again.';
      toast({
        title: 'Error updating property',
        description,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Edit Property
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter property title"
              {...form.register('title')}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              placeholder="Enter property location"
              {...form.register('location')}
            />
            {form.formState.errors.location && (
              <p className="text-sm text-destructive">{form.formState.errors.location.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bhk">BHK *</Label>
              <Input
                id="bhk"
                placeholder="e.g., 2 BHK"
                {...form.register('bhk')}
              />
              {form.formState.errors.bhk && (
                <p className="text-sm text-destructive">{form.formState.errors.bhk.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">Area *</Label>
              <Input
                id="area"
                placeholder="e.g., 1200 sq ft"
                {...form.register('area')}
              />
              {form.formState.errors.area && (
                <p className="text-sm text-destructive">{form.formState.errors.area.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price *</Label>
            <Input
              id="price"
              placeholder="e.g., ₹50L"
              {...form.register('price')}
            />
            {form.formState.errors.price && (
              <p className="text-sm text-destructive">{form.formState.errors.price.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter property description"
              rows={3}
              {...form.register('description')}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={form.watch('status')}
              onValueChange={(value) => form.setValue('status', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.status && (
              <p className="text-sm text-destructive">{form.formState.errors.status.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Property Images</Label>
            <ImageUpload
              images={images}
              onImagesChange={setImages}
              maxImages={10}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateProperty.isPending} className="gradient-primary border-0">
              {updateProperty.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update Property
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
