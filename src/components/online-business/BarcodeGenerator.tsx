import { useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useBarcodes } from '@/hooks/useBarcodes';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QrCode, Download, Printer, Package } from 'lucide-react';

export function BarcodeGenerator() {
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('EAN');

  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: barcodes } = useBarcodes();

  const activeProducts = products?.filter(p => p.status === 'active') || [];

  const generateBarcode = () => {
    // This would integrate with a barcode generation library
    // For now, we'll show a placeholder
    console.log('Generating barcode for product:', selectedProduct, 'type:', selectedType);
  };

  const existingBarcodes = barcodes?.filter(b => b.product_id === selectedProduct) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Barcode Generator</h1>
        <p className="text-muted-foreground">Generate and manage barcodes for your products</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generator Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Generate Barcode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Product</label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a product" />
                </SelectTrigger>
                <SelectContent>
                  {activeProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        <span>{product.name}</span>
                        <span className="text-xs text-muted-foreground">({product.sku})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Barcode Type</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EAN">EAN-13</SelectItem>
                  <SelectItem value="UPC">UPC-A</SelectItem>
                  <SelectItem value="CODE128">Code 128</SelectItem>
                  <SelectItem value="QR">QR Code</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={generateBarcode} disabled={!selectedProduct} className="flex-1">
                <QrCode className="w-4 h-4 mr-2" />
                Generate Barcode
              </Button>
              <Button variant="outline" disabled>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" disabled>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Area */}
        <Card>
          <CardHeader>
            <CardTitle>Barcode Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedProduct ? (
              <div className="text-center py-8">
                <div className="w-64 h-32 mx-auto border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center mb-4">
                  <div className="text-center">
                    <QrCode className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Barcode preview will appear here</p>
                    <p className="text-xs text-muted-foreground">Integration with barcode library needed</p>
                  </div>
                </div>
                {existingBarcodes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Existing Barcodes:</p>
                    <div className="flex flex-wrap gap-2">
                      {existingBarcodes.map((barcode) => (
                        <Badge key={barcode.id} variant="outline">
                          {barcode.barcode_type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <QrCode className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Select a product to generate barcode</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Generated Barcodes History */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Barcodes</CardTitle>
        </CardHeader>
        <CardContent>
          {barcodes && barcodes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {barcodes.map((barcode) => (
                <div key={barcode.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge>{barcode.barcode_type}</Badge>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline">
                        <Download className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Printer className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {barcode.products?.name}
                  </p>
                  <p className="text-xs font-mono bg-muted p-2 rounded">
                    {barcode.barcode_value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Generated: {new Date(barcode.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <QrCode className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No barcodes generated yet</p>
              <p className="text-sm">Generate your first barcode above</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
