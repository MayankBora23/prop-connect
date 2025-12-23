import React, { useState } from 'react';
import { MapPin, Maximize, IndianRupee, Share2, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Property } from '@/hooks/useProperties';
import { useDeleteProperty } from '@/hooks/useProperties';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { EditPropertyDialog } from './EditPropertyDialog';

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const deleteProperty = useDeleteProperty();

  const handleDelete = async () => {
    try {
      await deleteProperty.mutateAsync(property.id);
      toast.success(`${property.title} has been deleted successfully`);
    } catch (error) {
      toast.error(`Failed to delete ${property.title}`);
    }
  };

  return (
    <div className="card-elevated overflow-hidden animate-scale-in group">
      <div className="relative h-48 bg-secondary">
        {property.images && property.images.length > 0 ? (
          <img
            src={property.images[0]}
            alt={property.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <span className="text-4xl">🏠</span>
          </div>
        )}
        <div className={cn(
          'absolute top-3 left-3 text-xs px-2 py-1 rounded-full font-medium',
          property.status === 'available' ? 'bg-success text-success-foreground' :
          property.status === 'upcoming' ? 'bg-warning text-warning-foreground' :
          'bg-destructive text-destructive-foreground'
        )}>
          {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
        </div>
        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="secondary"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              setEditDialogOpen(true);
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Property</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {property.title}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-foreground text-lg mb-1">{property.title}</h3>
        
        <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
          <MapPin className="w-4 h-4" />
          <span>{property.location}</span>
        </div>
        
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {property.description || 'No description available'}
        </p>
        
        <div className="flex items-center gap-4 text-sm text-foreground mb-4">
          <div className="flex items-center gap-1">
            <span className="font-medium">{property.bhk}</span>
          </div>
          <div className="flex items-center gap-1">
            <Maximize className="w-4 h-4 text-muted-foreground" />
            <span>{property.area}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-1 text-primary font-bold text-lg">
            <IndianRupee className="w-5 h-5" />
            <span>{property.price}</span>
          </div>
          {/* <Button size="sm" className="gradient-primary border-0">
            View Details
          </Button> */}
        </div>
      </div>

      {/* Edit Dialog */}
      <EditPropertyDialog
        property={property}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </div>
  );
}
