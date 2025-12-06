import { useState } from 'react';
import { PropertyCard } from './PropertyCard';
import { PropertyForm } from './PropertyForm';
import { Button } from '@/components/ui/button';
import { Filter, Plus, RefreshCw } from 'lucide-react';
import { useProperties, useCreateProperty, useUpdateProperty, useDeleteProperty } from '@/hooks/useData';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { hasSupabase } from '@/lib/supabaseClient';
import type { Property } from '@/data/mockData';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function PropertiesView() {
  const [filter, setFilter] = useState<'all' | 'available' | 'upcoming' | 'sold'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [deletingProperty, setDeletingProperty] = useState<Property | null>(null);
  const { data: properties = [], isLoading, refetch } = useProperties();
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  const deleteProperty = useDeleteProperty();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['properties'] });
    toast({ title: 'Refreshed', description: 'Properties list updated' });
  };

  const handleSubmit = async (data: Partial<Property>) => {
    try {
      if (editingProperty) {
        await updateProperty.mutateAsync({ id: editingProperty.id, data });
        toast({ title: 'Success', description: 'Property updated successfully' });
      } else {
        console.log('Creating new property:', data);
        const newProperty = await createProperty.mutateAsync(data);
        console.log('Property created:', newProperty);
        toast({ 
          title: 'Success', 
          description: `Property "${newProperty.title}" created successfully and saved to Supabase` 
        });
      }
      setFormOpen(false);
      setEditingProperty(null);
      // Force refresh the properties list
      await refetch();
    } catch (error) {
      console.error('Error saving property:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save property. Check console for details.',
        variant: 'destructive',
      });
      throw error; // Re-throw so form can handle it
    }
  };

  const handleDelete = async () => {
    if (!deletingProperty) return;
    try {
      await deleteProperty.mutateAsync(deletingProperty.id);
      toast({ title: 'Success', description: 'Property deleted successfully' });
      setDeletingProperty(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete property',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setFormOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="text-muted-foreground">Loading properties from Supabase...</div>
      </div>
    );
  }

  const filteredProperties = properties.filter(
    (p) => filter === 'all' || p.status === filter
  );

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {['all', 'available', 'upcoming', 'sold'].map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(status as typeof filter)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              More Filters
            </Button>
            <Button size="sm" onClick={() => { setEditingProperty(null); setFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Property
            </Button>
          </div>
        </div>

        {/* Property Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onEdit={() => handleEdit(property)}
              onDelete={() => setDeletingProperty(property)}
            />
          ))}
        </div>

        {filteredProperties.length === 0 && properties.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-2">No properties found.</p>
            <p className="text-sm text-muted-foreground">
              {hasSupabase ? 'Add your first property using the "Add Property" button above.' : 'Supabase not configured. Properties will be saved locally.'}
            </p>
          </div>
        )}
        {filteredProperties.length === 0 && properties.length > 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No properties found with the selected filter.
          </div>
        )}
      </div>

      <PropertyForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingProperty(null);
        }}
        property={editingProperty}
        onSubmit={handleSubmit}
      />

      <AlertDialog open={!!deletingProperty} onOpenChange={(open) => !open && setDeletingProperty(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingProperty?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
