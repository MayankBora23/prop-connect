import { useState } from 'react';
import { useProperties } from '@/hooks/useProperties';
import { PropertyCard } from './PropertyCard';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Enums } from '@/integrations/supabase/types';

type PropertyStatus = Enums<'property_status'>;

export function PropertiesView() {
  const [filter, setFilter] = useState<'all' | PropertyStatus>('all');
  const { data: properties, isLoading } = useProperties();

  const filteredProperties = (properties || []).filter(
    (p) => filter === 'all' || p.status === filter
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'available', 'upcoming', 'sold'] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
        <div className="ml-auto">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            More Filters
          </Button>
        </div>
      </div>

      {/* Property Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-elevated overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}

      {!isLoading && filteredProperties.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No properties found with the selected filter.
        </div>
      )}
    </div>
  );
}
