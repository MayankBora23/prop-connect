import { useState } from 'react';
import { mockProperties } from '@/data/mockData';
import { PropertyCard } from './PropertyCard';
import { Button } from '@/components/ui/button';
import { Filter, Grid, List } from 'lucide-react';

export function PropertiesView() {
  const [filter, setFilter] = useState<'all' | 'available' | 'upcoming' | 'sold'>('all');

  const filteredProperties = mockProperties.filter(
    (p) => filter === 'all' || p.status === filter
  );

  return (
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
        <div className="ml-auto">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            More Filters
          </Button>
        </div>
      </div>

      {/* Property Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProperties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>

      {filteredProperties.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No properties found with the selected filter.
        </div>
      )}
    </div>
  );
}
