import { Button } from '@/components/ui/button';
import { Filter, Download, Upload, Truck } from 'lucide-react';

export function SuppliersView() {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Suppliers</h2>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Suppliers List */}
      <div className="card-elevated p-8 text-center">
        <Truck className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
        <p className="text-muted-foreground">Supplier management coming soon</p>
        <p className="text-sm text-muted-foreground">Manage suppliers, purchase orders, and vendor relationships</p>
      </div>
    </div>
  );
}
