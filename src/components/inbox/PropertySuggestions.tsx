import { useState, useEffect } from 'react';
import { useProperties } from '@/hooks/useProperties';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Home, IndianRupee, Maximize, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPropertyArea, getPropertyArea, formatPropertyPrice, parsePropertyPrice } from '@/lib/formatPropertyArea';
import type { Property } from '@/hooks/useProperties';

interface PropertySuggestionsProps {
  onSelectProperty?: (property: Property) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PropertySuggestions({ onSelectProperty, isOpen, onOpenChange }: PropertySuggestionsProps) {
  const { data: properties, isLoading } = useProperties();
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>('');
  const [maxBudget, setMaxBudget] = useState<string>('');

  // Get unique locations and property types for filters
  const locations = Array.from(new Set(properties?.map(p => p.city).filter(Boolean) || []));
  const propertyTypes = Array.from(new Set(properties?.map(p => p.property_type).filter(Boolean) || []));

  useEffect(() => {
    if (!properties) return;

    let filtered = properties.filter(property => {
      const matchesSearch = searchTerm === '' ||
        property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.property_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (property.amenities && property.amenities.some(amenity =>
          amenity.toLowerCase().includes(searchTerm.toLowerCase())
        )) ||
        property.status?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesLocation = selectedLocation === '' || property.city === selectedLocation;
      const matchesType = selectedPropertyType === '' || property.property_type === selectedPropertyType;
      const maxBudgetValue = maxBudget ? parsePropertyPrice(maxBudget) : 0;
      const propertyPrice = parsePropertyPrice(property.price);
      const matchesBudget = maxBudget === '' || (propertyPrice > 0 && propertyPrice <= maxBudgetValue);

      return matchesSearch && matchesLocation && matchesType && matchesBudget && property.status === 'available';
    });

    setFilteredProperties(filtered);
  }, [properties, searchTerm, selectedLocation, selectedPropertyType, maxBudget]);

  const formatPrice = (price: string | number | null | undefined) => formatPropertyPrice(price);

  const formatArea = (property: Property) => formatPropertyArea(getPropertyArea(property));

  const handleSendProperty = (property: Property) => {
    onSelectProperty?.(property);
    onOpenChange(false);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedLocation('');
    setSelectedPropertyType('');
    setMaxBudget('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            Property Suggestions
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Browse and send property details to your WhatsApp contacts
          </p>
        </DialogHeader>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-secondary/30 rounded-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search properties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger>
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              {locations.map(location => (
                <SelectItem key={location} value={location}>{location}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedPropertyType} onValueChange={setSelectedPropertyType}>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              {propertyTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Max Budget (₹)"
            value={maxBudget}
            onChange={(e) => setMaxBudget(e.target.value)}
            type="number"
          />
        </div>

        {(searchTerm || selectedLocation || selectedPropertyType || maxBudget) && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {searchTerm && <Badge variant="secondary">Search: {searchTerm}</Badge>}
            {selectedLocation && <Badge variant="secondary">Location: {selectedLocation}</Badge>}
            {selectedPropertyType && <Badge variant="secondary">Type: {selectedPropertyType}</Badge>}
            {maxBudget && <Badge variant="secondary">Max: ₹{parseInt(maxBudget).toLocaleString('en-IN')}</Badge>}
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear all
            </Button>
          </div>
        )}

        {/* Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <div className="aspect-video bg-secondary rounded-lg animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 bg-secondary rounded animate-pulse" />
                  <div className="h-3 bg-secondary rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-secondary rounded w-1/2 animate-pulse" />
                </div>
              </div>
            ))
          ) : filteredProperties.length > 0 ? (
            filteredProperties.map((property) => (
              <div key={property.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                {/* Property Image */}
                <div className="aspect-video bg-secondary relative">
                  {property.images && property.images.length > 0 ? (
                    <img
                      src={property.images[0]}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Home className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="bg-black/70 text-white border-0">
                      {property.status}
                    </Badge>
                  </div>
                </div>

                {/* Property Details */}
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-lg line-clamp-1">{property.title}</h3>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="line-clamp-1">
                        {property.location || property.city || property.address || 'Location not specified'}
                      </span>
                    </div>
                    {property.address && property.address !== (property.location || property.city) && (
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {property.address}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 font-semibold text-lg text-primary">
                      <IndianRupee className="w-4 h-4" />
                      <span>{formatPrice(property.price)}</span>
                    </div>

                    {getPropertyArea(property) && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Maximize className="w-4 h-4" />
                        <span>{formatArea(property)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {property.bhk && (
                      <Badge variant="outline">{typeof property.bhk === 'string' ? property.bhk : `${property.bhk} BHK`}</Badge>
                    )}
                    {property.property_type && (
                      <Badge variant="outline">{property.property_type}</Badge>
                    )}
                    <Badge
                      variant={property.status === 'available' ? 'default' : 'secondary'}
                      className={property.status === 'available' ? 'bg-green-500 hover:bg-green-600' : ''}
                    >
                      {property.status}
                    </Badge>
                  </div>

                  {property.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {property.description}
                    </p>
                  )}

                  {property.amenities && property.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {property.amenities.slice(0, 3).map((amenity, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {amenity}
                        </Badge>
                      ))}
                      {property.amenities.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{property.amenities.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  <Button
                    onClick={() => handleSendProperty(property)}
                    className="w-full mt-3"
                    size="sm"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Property Details
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              <Home className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No properties found matching your criteria</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}