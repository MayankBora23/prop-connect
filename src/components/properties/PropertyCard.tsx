import { MapPin, Maximize, IndianRupee, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Property } from '@/hooks/useProperties';

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
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
        <Button
          size="sm"
          variant="secondary"
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Share2 className="w-4 h-4" />
        </Button>
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
          <Button size="sm" className="gradient-primary border-0">
            View Details
          </Button>
        </div>
      </div>
    </div>
  );
}
