import React, { useState } from 'react';
import { useProducts, useDeleteProduct, useProduct, useProductVariants } from '@/hooks/useProducts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Filter, Download, Upload, Package, Search, ScanLine, Camera, Edit, Trash2, MoreHorizontal, Printer, ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { AddProductDialog } from './AddProductDialog';
import { EditProductDialog } from './EditProductDialog';
import { PrintableBarcode } from './PrintableBarcode';

export function ProductsView() {
  const { data: products, isLoading } = useProducts();
  const [searchQuery, setSearchQuery] = useState('');
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printingProduct, setPrintingProduct] = useState<any>(null);
  const [printQuantity, setPrintQuantity] = useState(10);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const deleteProduct = useDeleteProduct();

  // Group products by variant groups and filter
  const groupedProducts = products?.reduce((groups, product) => {
    const groupId = product.variant_group_id || product.id;
    if (!groups[groupId]) {
      groups[groupId] = [];
    }
    groups[groupId].push(product);
    return groups;
  }, {} as Record<string, typeof products>) || {};

  // Filter groups based on search query
  const filteredGroups = Object.entries(groupedProducts).filter(([groupId, productsInGroup]) => {
    const parentProduct = productsInGroup.find(p => p.product_type === 'variant') || productsInGroup[0];
    return productsInGroup.some(product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      parentProduct.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const toggleGroupExpansion = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const handleBarcodeScan = () => {
    if (!manualBarcode.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a barcode or SKU',
        variant: 'destructive',
      });
      return;
    }

    // First try to find by barcode
    let product = products?.find(p => p.barcode === manualBarcode.trim());

    // If not found by barcode, try to find by SKU
    if (!product) {
      product = products?.find(p => p.sku === manualBarcode.trim());
    }

    if (product) {
      toast({
        title: 'Product Found',
        description: `${product.name} (${product.sku}) - ₹${product.selling_price}`,
      });
      // Search for the product to highlight it
      setSearchQuery(product.sku || product.barcode || product.name);
      setScanDialogOpen(false);
      setManualBarcode('');
    } else {
      toast({
        title: 'Product Not Found',
        description: 'No product found with this barcode or SKU',
        variant: 'destructive',
      });
    }
  };

  const handleEditProduct = (productId: string) => {
    setEditingProductId(productId);
    setEditDialogOpen(true);
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    try {
      await deleteProduct.mutateAsync(productId);
      toast({
        title: 'Success',
        description: `Product "${productName}" deleted successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete product. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handlePrintBarcode = (product: any) => {
    setPrintingProduct(product);
    setPrintDialogOpen(true);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Products</h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setScanDialogOpen(true)}>
            <ScanLine className="w-4 h-4 mr-2" />
            Scan Barcode
          </Button>
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

      {/* Products List */}
      <div className="card-elevated overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Product</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">SKU</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Barcode</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unit</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stock</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-10 w-40" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-6 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-6 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-6 w-12" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-20" /></td>
                </tr>
              ))
            ) : filteredGroups.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                  No products found. Add your first product to get started.
                </td>
              </tr>
            ) : (
              filteredGroups.map(([groupId, productsInGroup]) => {
                const parentProduct = productsInGroup.find(p => p.product_type === 'variant');
                const variantProducts = productsInGroup.filter(p => p.product_type !== 'variant');
                const isExpanded = expandedGroups.has(groupId);
                const hasVariants = variantProducts.length > 0;

                return (
                  <React.Fragment key={groupId}>
                    {/* Parent/Variant Group Row */}
                    <tr className={`hover:bg-secondary/50 transition-colors ${hasVariants ? 'cursor-pointer' : ''}`}
                        onClick={hasVariants ? () => toggleGroupExpansion(groupId) : undefined}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {hasVariants && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleGroupExpansion(groupId);
                              }}
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          )}
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Package className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">
                              {parentProduct?.name || productsInGroup[0]?.name}
                              {hasVariants && <Badge variant="secondary" className="ml-2 text-xs">Group</Badge>}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {parentProduct?.description || productsInGroup[0]?.description || 'No description'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={parentProduct?.product_type === 'variant' ? 'default' : 'secondary'}>
                          {parentProduct?.product_type === 'variant' ? 'Variant Parent' : 'Simple'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {parentProduct?.sku || productsInGroup[0]?.sku || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground font-mono">
                        {parentProduct?.barcode || productsInGroup[0]?.barcode || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-foreground capitalize">
                          {parentProduct?.category || productsInGroup[0]?.category || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-foreground capitalize">
                          {parentProduct?.unit_type || productsInGroup[0]?.unit_type || 'piece'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">
                            ₹{(parentProduct?.selling_price || productsInGroup[0]?.selling_price || 0).toLocaleString()}
                          </span>
                          {hasVariants && (
                            <span className="text-xs text-muted-foreground">
                              {variantProducts.length} variant{variantProducts.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {hasVariants ? (
                          <span className="text-xs text-muted-foreground">
                            {variantProducts.length} variant{variantProducts.length !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-sm text-foreground">
                            {/* Stock will be shown from inventory system */}
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProduct(parentProduct?.id || productsInGroup[0]?.id)}
                            className="h-8 w-8 p-0"
                            title="Edit product"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {(parentProduct?.barcode || productsInGroup[0]?.barcode) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePrintBarcode(parentProduct || productsInGroup[0])}
                              className="h-8 w-8 p-0"
                              title="Print barcode"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                title="Delete product"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Product</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {hasVariants
                                    ? `Are you sure you want to delete this variant group and all ${variantProducts.length} variants? This action cannot be undone.`
                                    : `Are you sure you want to delete "${parentProduct?.name || productsInGroup[0]?.name}"? This action cannot be undone.`
                                  }
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteProduct(parentProduct?.id || productsInGroup[0]?.id, parentProduct?.name || productsInGroup[0]?.name)}
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

                    {/* Variant Rows */}
                    {hasVariants && isExpanded && variantProducts.map((variant) => (
                      <tr key={variant.id} className="bg-secondary/20 hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-2 pl-16">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                              <Package className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground text-sm">
                                {variant.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Variant of {parentProduct?.name}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <Badge variant="outline" className="text-xs">Variant</Badge>
                        </td>
                        <td className="px-4 py-2 text-sm text-foreground font-mono">
                          {variant.sku || '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-foreground font-mono">
                          {variant.barcode || '-'}
                        </td>
                        <td className="px-4 py-2">
                          <span className="text-sm text-foreground capitalize">
                            {variant.category || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className="text-sm text-foreground capitalize">
                            {variant.unit_type || 'piece'}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className="text-sm font-medium text-foreground">
                            ₹{(variant.selling_price || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditProduct(variant.id)}
                              className="h-6 w-6 p-0"
                              title="Edit variant"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            {variant.barcode && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePrintBarcode(variant)}
                                className="h-6 w-6 p-0"
                                title="Print barcode"
                              >
                                <Printer className="h-3 w-3" />
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                  title="Delete variant"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Variant</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete variant "{variant.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteProduct(variant.id, variant.name)}
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
                  ))}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Product Dialog */}
      <EditProductDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditingProductId(null);
        }}
        product={products?.find(p => p.id === editingProductId) || null}
      />

      {/* Barcode Scanning Dialog */}
      <Dialog open={scanDialogOpen} onOpenChange={setScanDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="w-5 h-5" />
              Scan Barcode
            </DialogTitle>
            <DialogDescription>
              Use your camera or manually enter a barcode/SKU to find product details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Camera Placeholder */}
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <Camera className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Camera scanning coming soon
              </p>
              <p className="text-xs text-muted-foreground">
                For now, manually enter the barcode below
              </p>
            </div>

            {/* Manual Barcode Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Enter Barcode Manually</label>
              <Input
                placeholder="Scan or type barcode/SKU..."
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleBarcodeScan()}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setScanDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBarcodeScan}>
                <Search className="w-4 h-4 mr-2" />
                Find Product
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Barcode Dialog */}
      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              Print Barcode Labels
            </DialogTitle>
            <DialogDescription>
              Generate printable barcode labels for {printingProduct?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {printingProduct && (
              <>
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium">Number of labels:</label>
                  <select
                    value={printQuantity}
                    onChange={(e) => setPrintQuantity(Number(e.target.value))}
                    className="border border-gray-300 rounded px-3 py-1 text-sm"
                  >
                    <option value={1}>1</option>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <PrintableBarcode
                  product={printingProduct}
                  quantity={printQuantity}
                  onClose={() => setPrintDialogOpen(false)}
                />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
