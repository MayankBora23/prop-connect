import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Property } from '@/data/mockData';

interface PropertyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property?: Property | null;
  onSubmit: (data: Partial<Property>) => Promise<void>;
}

export function PropertyForm({ open, onOpenChange, property, onSubmit }: PropertyFormProps) {
  const [formData, setFormData] = useState<Partial<Property>>({
    title: '',
    location: '',
    bhk: '',
    area: '',
    price: '',
    description: '',
    status: 'available',
    images: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (property) {
      setFormData(property);
    } else {
      setFormData({
        title: '',
        location: '',
        bhk: '',
        area: '',
        price: '',
        description: '',
        status: 'available',
        images: [],
      });
    }
  }, [property, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      alert('Please enter a property title');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      // Don't close here - let the parent handle it after success
    } catch (error) {
      console.error('Error saving property:', error);
      // Keep form open on error so user can fix and retry
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{property ? 'Edit Property' : 'Add New Property'}</DialogTitle>
          <DialogDescription>
            {property ? 'Update property details' : 'Add a new property to your inventory'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bhk">BHK</Label>
              <Input
                id="bhk"
                value={formData.bhk}
                onChange={(e) => setFormData({ ...formData, bhk: e.target.value })}
                placeholder="e.g., 2/3 BHK"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="area">Area</Label>
              <Input
                id="area"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                placeholder="e.g., 1200-1800 sq.ft"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="e.g., ₹45L - ₹75L"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as Property['status'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : property ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

