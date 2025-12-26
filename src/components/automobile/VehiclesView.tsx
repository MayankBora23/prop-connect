import { useVehicles } from '@/hooks/useVehicles';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Filter, Download, Upload, Car, Fuel, Settings, Edit, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useDeleteVehicle } from '@/hooks/useVehicles';
import { toast } from 'sonner';

export function VehiclesView() {
  const { data: vehicles, isLoading } = useVehicles();
  const deleteVehicle = useDeleteVehicle();

  const handleDelete = async (vehicleId: string, vehicleName: string) => {
    try {
      await deleteVehicle.mutateAsync(vehicleId);
      toast.success(`${vehicleName} has been deleted successfully`);
    } catch (error) {
      toast.error(`Failed to delete ${vehicleName}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'sold': return 'bg-red-100 text-red-800';
      case 'reserved': return 'bg-yellow-100 text-yellow-800';
      case 'maintenance': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFuelIcon = (fuelType: string) => {
    switch (fuelType) {
      case 'electric': return '⚡';
      case 'hybrid': return '🔋';
      case 'diesel': return '⛽';
      default: return '⛽';
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Vehicles</h2>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Vehicles List */}
      <div className="card-elevated overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vehicle</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fuel</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transmission</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-10 w-40" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-6 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-16" /></td>
                </tr>
              ))
            ) : (vehicles || []).length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No vehicles found. Add your first vehicle to get started.
                </td>
              </tr>
            ) : (
              (vehicles || []).map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-secondary/50 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Car className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {vehicle.year} {vehicle.brand} {vehicle.model}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {vehicle.variant && `${vehicle.variant} • `}{vehicle.stock_number}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="capitalize">
                      {vehicle.vehicle_type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getFuelIcon(vehicle.fuel_type)}</span>
                      <span className="text-sm text-foreground capitalize">
                        {vehicle.fuel_type}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-foreground capitalize">
                        {vehicle.transmission}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">
                    ₹{vehicle.price.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={getStatusColor(vehicle.status)}>
                      {vehicle.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {vehicle.year} {vehicle.brand} {vehicle.model}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(vehicle.id, `${vehicle.year} ${vehicle.brand} ${vehicle.model}`)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
