import { useState } from 'react';
import { useOnlineCustomers } from '@/hooks/useOnlineCustomers';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Filter, Download, Upload, Users, Phone, Mail, MapPin, Grid, List, MoreHorizontal, Edit, Trash2, Eye } from 'lucide-react';
import { CustomerPipeline } from './CustomerPipeline';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function CustomersView() {
  const { data: customers, isLoading } = useOnlineCustomers();
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('list');

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Customers</h2>
          <Badge variant="secondary" className="text-xs">
            {customers?.length || 0} total
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center border rounded-md p-1">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 px-3"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'pipeline' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('pipeline')}
              className="h-8 px-3"
            >
              <Grid className="w-4 h-4" />
            </Button>
          </div>

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

      {/* Content */}
      {viewMode === 'pipeline' ? (
        <CustomerPipeline />
      ) : (
        /* Customers List */
        <div className="card-elevated overflow-hidden">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Orders</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Spent</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Order</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><Skeleton className="h-10 w-40" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-12" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-8" /></td>
                  </tr>
                ))
              ) : (customers || []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No customers found. Add your first customer to get started.
                  </td>
                </tr>
              ) : (
                (customers || []).map((customer) => (
                  <tr key={customer.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-xs">
                          {customer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{customer.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(customer as any).customer_group && `${(customer as any).customer_group} • `}
                            {customer.gender && `${customer.gender}`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          <p className="text-sm text-foreground">{customer.phone}</p>
                        </div>
                        {customer.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">{customer.email}</p>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-foreground">
                            {customer.city && customer.state ? `${customer.city}, ${customer.state}` : customer.city || customer.state || '-'}
                          </p>
                          {customer.pincode && (
                            <p className="text-xs text-muted-foreground">PIN: {customer.pincode}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {(customer as any).total_orders || 0}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      ₹{((customer as any).total_spent || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {(customer as any).last_order_date ? new Date((customer as any).last_order_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Customer
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Customer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
