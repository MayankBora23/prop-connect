import { useState, useEffect } from 'react';
import { useVehicles } from '@/hooks/useVehicles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, Car, Calendar, Fuel, Settings, IndianRupee, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Vehicle } from '@/hooks/useVehicles';

interface VehicleSuggestionsProps {
  onSelectVehicle?: (vehicle: Vehicle) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VehicleSuggestions({ onSelectVehicle, isOpen, onOpenChange }: VehicleSuggestionsProps) {
  const { data: vehicles, isLoading } = useVehicles();
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedFuelType, setSelectedFuelType] = useState<string>('all');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('available');

  // Get unique brands and vehicle types for filters
  const brands = Array.from(new Set(vehicles?.map(v => v.brand).filter(Boolean) || []));
  const vehicleTypes = Array.from(new Set(vehicles?.map(v => v.vehicle_type).filter(Boolean) || []));
  const fuelTypes = Array.from(new Set(vehicles?.map(v => v.fuel_type).filter(Boolean) || []));

  useEffect(() => {
    if (!vehicles) return;

    let filtered = vehicles.filter(vehicle => {
      const matchesSearch = searchTerm === '' ||
        vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.variant?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = selectedVehicleType === 'all' || vehicle.vehicle_type === selectedVehicleType;
      const matchesBrand = selectedBrand === 'all' || vehicle.brand === selectedBrand;
      const matchesFuel = selectedFuelType === 'all' || vehicle.fuel_type === selectedFuelType;
      const matchesStatus = selectedStatus === 'all' || vehicle.status === selectedStatus;
      const matchesPrice = maxPrice === '' || (vehicle.price && parseFloat(vehicle.price.toString()) <= parseFloat(maxPrice));

      return matchesSearch && matchesType && matchesBrand && matchesFuel && matchesStatus && matchesPrice;
    });

    setFilteredVehicles(filtered);
  }, [vehicles, searchTerm, selectedVehicleType, selectedBrand, selectedFuelType, selectedStatus, maxPrice]);

  const formatPrice = (price: any) => {
    if (!price) return 'Price on request';
    return `₹${Number(price).toLocaleString('en-IN')}`;
  };

  const getVehicleTypeColor = (type: string) => {
    switch (type) {
      case 'car': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'bike': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-success/10 text-success border-success/20';
      case 'sold': return 'bg-red-100 text-red-800 border-red-200';
      case 'reserved': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const getFuelTypeIcon = (fuelType: string) => {
    switch (fuelType) {
      case 'petrol': return '⛽';
      case 'diesel': return '⛽';
      case 'electric': return '🔋';
      case 'hybrid': return '⚡';
      case 'cng': return '🌿';
      default: return '⛽';
    }
  };

  const handleSendVehicle = (vehicle: Vehicle) => {
    onSelectVehicle?.(vehicle);
    onOpenChange(false);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedVehicleType('all');
    setSelectedBrand('all');
    setSelectedFuelType('all');
    setSelectedStatus('available');
    setMaxPrice('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="w-5 h-5" />
            Vehicle Suggestions
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Browse and send vehicle details to your WhatsApp contacts
          </p>
        </DialogHeader>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 p-4 bg-secondary/30 rounded-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search vehicles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={selectedVehicleType} onValueChange={setSelectedVehicleType}>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {vehicleTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedBrand} onValueChange={setSelectedBrand}>
            <SelectTrigger>
              <SelectValue placeholder="All Brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {brands.map(brand => (
                <SelectItem key={brand} value={brand}>
                  {brand}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedFuelType} onValueChange={setSelectedFuelType}>
            <SelectTrigger>
              <SelectValue placeholder="All Fuels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fuels</SelectItem>
              {fuelTypes.map(fuel => (
                <SelectItem key={fuel} value={fuel}>
                  {fuel.charAt(0).toUpperCase() + fuel.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="reserved">Reserved</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Max Price Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              placeholder="Max Price (₹)"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              type="number"
            />
          </div>
        </div>

        {(searchTerm || selectedVehicleType !== 'all' || selectedBrand !== 'all' || selectedFuelType !== 'all' || selectedStatus !== 'available' || maxPrice) && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {searchTerm && <Badge variant="secondary">Search: {searchTerm}</Badge>}
            {selectedVehicleType !== 'all' && <Badge variant="secondary">Type: {selectedVehicleType}</Badge>}
            {selectedBrand !== 'all' && <Badge variant="secondary">Brand: {selectedBrand}</Badge>}
            {selectedFuelType !== 'all' && <Badge variant="secondary">Fuel: {selectedFuelType}</Badge>}
            {selectedStatus !== 'available' && <Badge variant="secondary">Status: {selectedStatus}</Badge>}
            {maxPrice && <Badge variant="secondary">Max: ₹{maxPrice}</Badge>}
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear all
            </Button>
          </div>
        )}

        {/* Vehicles Grid */}
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
          ) : filteredVehicles.length > 0 ? (
            filteredVehicles.map((vehicle) => (
              <div key={vehicle.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                {/* Vehicle Header */}
                <div className="relative h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <div className="text-center">
                    <Car className="w-8 h-8 mx-auto text-primary mb-1" />
                    <div className={cn(
                      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
                      getVehicleTypeColor(vehicle.vehicle_type)
                    )}>
                      {vehicle.vehicle_type.charAt(0).toUpperCase() + vehicle.vehicle_type.slice(1)}
                    </div>
                  </div>

                  <div className={cn(
                    'absolute top-2 left-2 text-xs px-2 py-1 rounded-full font-medium border',
                    getStatusColor(vehicle.status)
                  )}>
                    {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
                  </div>
                </div>

                {/* Vehicle Details */}
                <div className="p-4 space-y-3">
                  <h3 className="font-semibold text-lg line-clamp-1">
                    {vehicle.brand} {vehicle.model} {vehicle.variant && `(${vehicle.variant})`}
                  </h3>

                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {vehicle.description || 'No description available'}
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{vehicle.year}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="text-lg">{getFuelTypeIcon(vehicle.fuel_type)}</span>
                      <span>{vehicle.fuel_type.charAt(0).toUpperCase() + vehicle.fuel_type.slice(1)}</span>
                      <span>•</span>
                      <Settings className="w-4 h-4" />
                      <span>{vehicle.transmission.charAt(0).toUpperCase() + vehicle.transmission.slice(1)}</span>
                    </div>

                    {vehicle.mileage && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>📏 {vehicle.mileage} km</span>
                        {vehicle.seating_capacity && <span>• 👥 {vehicle.seating_capacity} seats</span>}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-primary font-bold text-lg">
                      <IndianRupee className="w-4 h-4" />
                      <span>{formatPrice(vehicle.price)}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {vehicle.color && (
                        <Badge variant="outline" className="text-xs">
                          {vehicle.color}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleSendVehicle(vehicle)}
                    className="w-full"
                    size="sm"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Vehicle Details
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No vehicles found matching your criteria</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}