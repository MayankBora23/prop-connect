import { Property } from '@/data/mockData';
import { MapPin, Maximize, IndianRupee, Share2, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PropertyCardProps {
  property: Property;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function PropertyCard({ property, onEdit, onDelete }: PropertyCardProps) {
  return (
    <div className="card-elevated overflow-hidden animate-scale-in group">
      <div className="relative h-48 bg-secondary">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <span className="text-4xl">🏠</span>
        </div>
        <div className={cn(
          'absolute top-3 left-3 text-xs px-2 py-1 rounded-full font-medium',
          property.status === 'available' ? 'bg-success text-success-foreground' :
          property.status === 'upcoming' ? 'bg-warning text-warning-foreground' :
          'bg-destructive text-destructive-foreground'
        )}>
          {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
        </div>
        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="sm" variant="secondary">
            <Share2 className="w-4 h-4" />
          </Button>
          {(onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="secondary">⋯</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-foreground text-lg mb-1">{property.title}</h3>
        
        <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
          <MapPin className="w-4 h-4" />
          <span>{property.location}</span>
        </div>
        
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {property.description}
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
          <Button size="sm" className="gradient-primary border-0">
            View Details
          </Button>
        </div>
      </div>
    </div>
  );
}
