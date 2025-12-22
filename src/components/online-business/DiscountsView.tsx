import { Button } from '@/components/ui/button';
import { Filter, Download, Upload, Tag } from 'lucide-react';

export function DiscountsView() {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Discounts</h2>
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

      {/* Discounts List */}
      <div className="card-elevated p-8 text-center">
        <Tag className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
        <p className="text-muted-foreground">Discount management coming soon</p>
        <p className="text-sm text-muted-foreground">Create coupons, promotions, and discount rules</p>
      </div>
    </div>
  );
}
