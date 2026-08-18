import { MapPin, Maximize, IndianRupee, Share2, BedDouble } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Property } from '@/hooks/useProperties';

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  return (
    <article className="card-elevated group animate-scale-in overflow-hidden">
      <div className="relative h-44 overflow-hidden bg-secondary sm:h-48">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-primary-glow/15 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center text-5xl transition-transform duration-500 group-hover:scale-110">
          🏙️
        </div>
        <div
          className={cn(
            'absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm',
            property.status === 'available'
              ? 'bg-success/90 text-success-foreground'
              : property.status === 'upcoming'
              ? 'bg-warning/90 text-warning-foreground'
              : 'bg-destructive/90 text-destructive-foreground'
          )}
        >
          {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
        </div>
        <Button
          size="icon"
          variant="secondary"
          className="absolute right-3 top-3 h-8 w-8 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Share property"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-5">
        <h3 className="font-display text-lg font-semibold leading-snug text-foreground">{property.title}</h3>

        <div className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span className="truncate">{property.location}</span>
        </div>

        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {property.description || 'No description available'}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="chip">
            <BedDouble className="h-3.5 w-3.5" />
            {property.bhk}
          </span>
          <span className="chip">
            <Maximize className="h-3.5 w-3.5" />
            {property.area}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/70 pt-4">
          <div className="flex items-center gap-0.5 font-display text-lg font-bold text-foreground">
            <IndianRupee className="h-4 w-4 text-primary" />
            <span>{property.price}</span>
          </div>
          <Button size="sm" className="rounded-full border-0 gradient-primary">
            View Details
          </Button>
        </div>
      </div>
    </article>
  );
}
