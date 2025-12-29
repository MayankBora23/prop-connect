import { useState } from 'react';
import { useInventory, useInventoryLedger, useUpdateInventoryStock } from '@/hooks/useInventory';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Filter, Download, Upload, Package, TrendingUp, TrendingDown, History, Plus, Minus, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const stockAdjustmentSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  quantity: z.coerce.number().min(1, 'Quantity must be greater than 0'),
  action: z.enum(['stock_in', 'stock_out', 'adjustment']),
  notes: z.string().optional(),
});

const inventorySettingsSchema = z.object({
  reorder_point: z.coerce.number().min(0, 'Reorder point must be 0 or greater'),
  minimum_stock: z.coerce.number().min(0, 'Minimum stock must be 0 or greater'),
  maximum_stock: z.coerce.number().min(0, 'Maximum stock must be 0 or greater').optional().or(z.literal('')),
  location: z.string().optional(),
  auto_reorder: z.boolean().default(false),
});

type StockAdjustmentFormData = z.infer<typeof stockAdjustmentSchema>;
type InventorySettingsFormData = z.infer<typeof inventorySettingsSchema>;

export function InventoryView() {
  const { data: inventory, isLoading } = useInventory();
  const { data: ledger } = useInventoryLedger();
  const [searchQuery, setSearchQuery] = useState('');
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<any>(null);
  const { toast } = useToast();
  const updateInventoryStock = useUpdateInventoryStock();
  const queryClient = useQueryClient();

  const form = useForm<StockAdjustmentFormData>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      sku: '',
      quantity: 1,
      action: 'stock_in',
      notes: '',
    },
  });

  const settingsForm = useForm<InventorySettingsFormData>({
    resolver: zodResolver(inventorySettingsSchema),
    defaultValues: {
      reorder_point: 10,
      minimum_stock: 5,
      maximum_stock: '',
      location: '',
      auto_reorder: false,
    },
  });

  // Filter inventory based on search query
  const filteredInventory = inventory?.filter(item =>
    item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.products?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleStockAdjustment = async (data: StockAdjustmentFormData) => {
    try {
      const quantityChange = data.action === 'stock_in' ? data.quantity : -data.quantity;

      await updateInventoryStock.mutateAsync({
        sku: data.sku,
        quantityChange,
        action: data.action,
        referenceType: 'adjustment',
        notes: data.notes,
      });

      toast({
        title: 'Success',
        description: `Stock ${data.action === 'stock_in' ? 'increased' : 'decreased'} by ${data.quantity} units`,
      });

      form.reset();
      setAdjustmentDialogOpen(false);
      setSelectedSku(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to adjust stock',
        variant: 'destructive',
      });
    }
  };

  const openAdjustmentDialog = (sku: string) => {
    setSelectedSku(sku);
    form.setValue('sku', sku);
    setAdjustmentDialogOpen(true);
  };

  const openSettingsDialog = (item: any) => {
    setSelectedInventoryItem(item);
    settingsForm.reset({
      reorder_point: item.reorder_point || 10,
      minimum_stock: item.minimum_stock || 5,
      maximum_stock: item.maximum_stock || '',
      location: item.location || '',
      auto_reorder: item.auto_reorder || false,
    });
    setSettingsDialogOpen(true);
  };

  const onSettingsSubmit = async (data: InventorySettingsFormData) => {
    if (!selectedInventoryItem) return;

    try {
      const updateData = {
        reorder_point: data.reorder_point,
        minimum_stock: data.minimum_stock,
        maximum_stock: data.maximum_stock ? parseInt(data.maximum_stock.toString()) : null,
        location: data.location || null,
        auto_reorder: data.auto_reorder,
      };

      // Try to update existing inventory record
      const { error } = await supabase
        .from('sku_inventory' as any)
        .update(updateData)
        .eq('sku', selectedInventoryItem.sku);

      if (error) {
        // If update fails (no existing record), create new inventory record
        const { error: insertError } = await supabase
          .from('sku_inventory' as any)
          .insert({
            sku: selectedInventoryItem.sku,
            ...updateData,
            opening_stock: selectedInventoryItem.current_stock || 0,
            current_stock: selectedInventoryItem.current_stock || 0,
            reserved_stock: selectedInventoryItem.reserved_stock || 0,
            company_id: selectedInventoryItem.company_id,
          });

        if (insertError) throw insertError;
      }

      toast({
        title: 'Success',
        description: 'Inventory settings updated successfully',
      });

      // Refresh inventory data
      queryClient.invalidateQueries({ queryKey: ['inventory'] });

      setSettingsDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update inventory settings',
        variant: 'destructive',
      });
    }
  };

  const getStockStatusColor = (item: any) => {
    if (item.current_stock === 0) return 'bg-red-100 text-red-800';
    if (item.current_stock <= item.minimum_stock) return 'bg-red-100 text-red-800';
    if (item.available_stock === 0) return 'bg-yellow-100 text-yellow-800';
    if (item.available_stock <= item.reorder_point) return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  const getStockStatusText = (item: any) => {
    if (item.current_stock === 0) return 'Out of Stock';
    if (item.current_stock <= item.minimum_stock) return 'Critical';
    if (item.available_stock === 0) return 'Reserved Only';
    if (item.available_stock <= item.reorder_point) return 'Reorder Soon';
    return 'Good Stock';
  };

  // Calculate inventory stats
  const lowStockItems = inventory?.filter(item => item.available_stock <= item.reorder_point) || [];
  const criticalStockItems = inventory?.filter(item => item.current_stock <= item.minimum_stock) || [];
  const outOfStockItems = inventory?.filter(item => item.current_stock === 0) || [];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Inventory Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card-elevated p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total SKUs</p>
              <p className="text-2xl font-bold">{inventory?.length || 0}</p>
            </div>
          </div>
        </div>

        <div className="card-elevated p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
              <p className="text-2xl font-bold text-orange-600">{lowStockItems.length}</p>
            </div>
          </div>
        </div>

        <div className="card-elevated p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Critical</p>
              <p className="text-2xl font-bold text-red-600">{criticalStockItems.length}</p>
            </div>
          </div>
        </div>

        <div className="card-elevated p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Settings className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Out of Stock</p>
              <p className="text-2xl font-bold text-gray-600">{outOfStockItems.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Inventory Management</h2>
          <Badge variant="secondary" className="text-xs">
            {inventory?.length || 0} SKUs
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Search by SKU or product name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
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

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList>
          <TabsTrigger value="inventory">Current Stock</TabsTrigger>
          <TabsTrigger value="ledger">Stock Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          {/* Inventory Table */}
          <div className="card-elevated overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Reorder Point</TableHead>
                  <TableHead>Min Stock</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-10 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredInventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="w-12 h-12 text-muted-foreground/50" />
                        <p className="font-medium">No products with SKUs found</p>
                        <p className="text-sm">Create products with variants in the Products section to manage inventory here</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInventory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Package className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">
                              {item.products?.name || 'Unknown Product'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.products?.variant_group_id ? 'Variant' : 'Simple Product'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell className="text-center font-medium">{item.current_stock}</TableCell>
                      <TableCell className="text-center font-medium">{item.available_stock}</TableCell>
                      <TableCell className="text-center">{item.reorder_point}</TableCell>
                      <TableCell className="text-center">{item.minimum_stock}</TableCell>
                      <TableCell className="text-sm">{item.location || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge className={getStockStatusColor(item)}>
                            {getStockStatusText(item)}
                          </Badge>
                          {item.current_stock <= item.reorder_point && (
                            <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                              Reorder Soon
                            </Badge>
                          )}
                          {item.current_stock <= item.minimum_stock && (
                            <Badge variant="destructive" className="text-xs">
                              Low Stock
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openAdjustmentDialog(item.sku)}
                            className="h-8 w-8 p-0"
                            title="Adjust stock"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openSettingsDialog(item)}
                            className="h-8 w-8 p-0"
                            title="Inventory Settings"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="ledger" className="space-y-4">
          {/* Inventory Ledger */}
          <div className="card-elevated overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <History className="w-12 h-12 text-muted-foreground/50" />
                        <p>No inventory transactions yet</p>
                        <p className="text-sm">Stock movements will appear here</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  ledger?.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{entry.sku}</TableCell>
                      <TableCell>
                        <Badge
                          variant={entry.action === 'stock_in' ? 'default' :
                                 entry.action === 'stock_out' ? 'destructive' :
                                 entry.action === 'return_to_stock' ? 'secondary' : 'outline'}
                        >
                          {entry.action === 'stock_in' && <TrendingUp className="w-3 h-3 mr-1" />}
                          {entry.action === 'stock_out' && <TrendingDown className="w-3 h-3 mr-1" />}
                          {entry.action === 'return_to_stock' && <TrendingUp className="w-3 h-3 mr-1" />}
                          {entry.action.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {entry.action === 'stock_out' ? '-' : '+'}{entry.quantity}
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.reference_type && entry.reference_id ?
                          `${entry.reference_type} #${entry.reference_id}` :
                          '-'
                        }
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Stock Adjustment Dialog */}
      <Dialog open={adjustmentDialogOpen} onOpenChange={setAdjustmentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              Manually adjust stock levels for SKU: {selectedSku}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleStockAdjustment)} className="space-y-4">
              <FormField
                control={form.control}
                name="action"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adjustment Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select action" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="stock_in">Stock In (+)</SelectItem>
                        <SelectItem value="stock_out">Stock Out (-)</SelectItem>
                        <SelectItem value="adjustment">Adjustment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Reason for adjustment..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAdjustmentDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateInventoryStock.isPending}>
                  {updateInventoryStock.isPending ? 'Adjusting...' : 'Adjust Stock'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Inventory Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Inventory Settings</DialogTitle>
            <DialogDescription>
              Configure stock levels and alerts for {selectedInventoryItem?.sku}
            </DialogDescription>
          </DialogHeader>

          <Form {...settingsForm}>
            <form onSubmit={settingsForm.handleSubmit(onSettingsSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={settingsForm.control}
                  name="reorder_point"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reorder Point</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="10"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={settingsForm.control}
                  name="minimum_stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Stock</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="5"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={settingsForm.control}
                name="maximum_stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Stock (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Leave empty for unlimited"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={settingsForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Storage Location</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Warehouse A, Shelf 3"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={settingsForm.control}
                name="auto_reorder"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Auto Reorder</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Automatically reorder when stock reaches reorder point
                      </div>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSettingsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Save Settings
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
