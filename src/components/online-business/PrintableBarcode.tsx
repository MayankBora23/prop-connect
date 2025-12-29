import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Printer, Download } from 'lucide-react';

// EAN-13 Encoding patterns
const LEFT_ODD_PATTERNS = [
  '0001101', '0011001', '0010011', '0111101', '0100011',
  '0110001', '0101111', '0111011', '0110111', '0001011'
];

const LEFT_EVEN_PATTERNS = [
  '0100111', '0110011', '0011011', '0100001', '0011101',
  '0111001', '0000101', '0010001', '0001001', '0010111'
];

const RIGHT_PATTERNS = [
  '1110010', '1100110', '1101100', '1000010', '1011100',
  '1001110', '1010000', '1000100', '1001000', '1110100'
];

// Generate a real EAN-13 barcode that is scannable by phones and barcode readers
const generateEAN13Barcode = (value: string): string => {
  // Clean and pad the input to 12 digits
  let cleanValue = value.replace(/[^0-9]/g, '').substring(0, 12);
  cleanValue = cleanValue.padStart(12, '0');

  // Calculate checksum
  const checksum = calculateEAN13Checksum(cleanValue);
  const fullCode = cleanValue + checksum;

  // Determine parity pattern for left side (first digit)
  const firstDigit = parseInt(fullCode[0]);
  const parityPattern = getParityPattern(firstDigit);

  // Build the barcode pattern
  let pattern = '101'; // Start guard

  // Left side (digits 1-6)
  for (let i = 1; i <= 6; i++) {
    const digit = parseInt(fullCode[i]);
    const isEven = parityPattern[i - 1] === 'E';
    const pattern7 = isEven ? LEFT_EVEN_PATTERNS[digit] : LEFT_ODD_PATTERNS[digit];
    pattern += pattern7;
  }

  pattern += '01010'; // Middle guard

  // Right side (digits 7-12)
  for (let i = 7; i <= 12; i++) {
    const digit = parseInt(fullCode[i]);
    pattern += RIGHT_PATTERNS[digit];
  }

  pattern += '101'; // End guard

  // Convert pattern to SVG
  return patternToSVG(pattern, fullCode);
};

const getParityPattern = (firstDigit: number): string[] => {
  const patterns = [
    'OOOOOO', // 0
    'OOEOEE', // 1
    'OOEEOE', // 2
    'OOEEEO', // 3
    'OEOOEE', // 4
    'OEEOOE', // 5
    'OEEEOO', // 6
    'OEOEOE', // 7
    'OEOEEO', // 8
    'OEEOEO'  // 9
  ];
  return patterns[firstDigit].split('');
};

const patternToSVG = (pattern: string, fullCode: string): string => {
  const moduleWidth = 1.5; // Width of each module in pixels
  const height = 50;
  const quietZone = 10;

  let x = quietZone;
  let svgContent = '';

  // Draw the barcode bars
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '1') {
      const barHeight = (i >= 3 && i < pattern.length - 3) ? height : height - 10; // Guard bars are shorter
      svgContent += `<rect x="${x}" y="${height - barHeight}" width="${moduleWidth}" height="${barHeight}" fill="black"/>`;
    }
    x += moduleWidth;
  }

  const totalWidth = x + quietZone;

  return `
    <svg width="${totalWidth}" height="${height + 15}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${totalWidth}" height="${height + 15}" fill="white"/>
      ${svgContent}
      <text x="${totalWidth / 2}" y="${height + 12}" text-anchor="middle" font-family="monospace" font-size="10" font-weight="bold">${fullCode}</text>
    </svg>
  `;
};

const calculateEAN13Checksum = (digits: string): number => {
  // Ensure we have exactly 12 digits
  const cleanDigits = digits.replace(/[^0-9]/g, '').substring(0, 12).padStart(12, '0');

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    // Odd positions (1,3,5,7,9,11) get weight 1, even positions (0,2,4,6,8,10) get weight 3
    sum += parseInt(cleanDigits[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checksum = (10 - (sum % 10)) % 10;
  return checksum;
};

const generateBarcodePattern = (value: string): string => {
  // Simplified pattern generation
  return value;
};

interface PrintableBarcodeProps {
  product: {
    id: string;
    name: string;
    sku?: string;
    barcode?: string;
    selling_price?: number;
    unit_type?: string;
  };
  quantity?: number;
  onClose?: () => void;
}

export function PrintableBarcode({ product, quantity = 1, onClose }: PrintableBarcodeProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // Generate barcode if not provided - ensure it's 12 digits for EAN-13
  const barcodeValue = product.barcode || product.id.replace(/[^0-9]/g, '').slice(-12).padStart(12, '0');
  const barcodeSvg = generateEAN13Barcode(barcodeValue);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode Labels - ${product.name}</title>
          <style>
            @media print {
              .no-print { display: none; }
              .page-break { page-break-after: always; }
              body { margin: 0; padding: 10mm; }
              .label-container { display: flex; flex-wrap: wrap; gap: 5mm; }
              .barcode-label {
                width: 65mm;
                height: 35mm;
                border: 1px solid #000;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                padding: 2mm;
                box-sizing: border-box;
                font-family: Arial, sans-serif;
                font-size: 7pt;
                background: white;
              }
              .product-name { font-weight: bold; font-size: 9pt; text-align: center; margin-bottom: 1mm; }
              .product-details { display: flex; justify-content: space-between; width: 100%; font-size: 6pt; margin-bottom: 1mm; }
              .barcode-container { display: flex; flex-direction: column; align-items: center; width: 100%; }
              .barcode-svg { width: 55mm; height: 18mm; margin-bottom: 1mm; }
              .barcode-text { font-family: monospace; font-size: 6pt; text-align: center; }
            }
            @page { size: A4; margin: 10mm; }
          </style>
        </head>
        <body>
          <div class="label-container">
            ${Array.from({ length: quantity }, (_, i) => `
              <div class="barcode-label">
                <div class="product-name">${product.name}</div>
                <div class="product-details">
                  <span>SKU: ${product.sku || 'N/A'}</span>
                  <span>₹${product.selling_price || 0}</span>
                </div>
                <div class="barcode-container">
                  <div class="barcode-svg">${barcodeSvg}</div>
                  <div class="barcode-text">${barcodeValue}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  };

  const handleDownload = () => {
    // Create a simple text file with barcode data
    const content = `Product: ${product.name}\nSKU: ${product.sku || 'N/A'}\nBarcode: ${barcodeValue}\nPrice: ₹${product.selling_price || 0}\nUnit: ${product.unit_type || 'piece'}\n\nGenerated on: ${new Date().toLocaleString()}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barcode-${product.name.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Print Preview */}
      <Card className="p-4">
        <div ref={printRef} className="space-y-4">
          <h3 className="text-lg font-semibold text-center">Barcode Labels Preview</h3>
          <div className="flex flex-wrap gap-4 justify-center">
            {Array.from({ length: Math.min(quantity, 6) }, (_, i) => (
              <div key={i} className="border border-gray-300 rounded p-3 w-48 h-28 flex flex-col justify-center items-center bg-white">
                <div className="font-bold text-xs text-center mb-1">{product.name}</div>
                <div className="flex justify-between w-full text-xs mb-1">
                  <span>SKU: {product.sku || 'N/A'}</span>
                  <span>₹{product.selling_price || 0}</span>
                </div>
                <div className="w-full h-8 mb-1 flex justify-center">
                  <div dangerouslySetInnerHTML={{ __html: barcodeSvg }} className="scale-50 origin-center" />
                </div>
                <div className="font-mono text-xs">{barcodeValue}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <Button onClick={handlePrint} className="flex items-center gap-2">
          <Printer className="w-4 h-4" />
          Print Labels ({quantity})
        </Button>
        <Button variant="outline" onClick={handleDownload} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Download Data
        </Button>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Instructions */}
      <div className="text-sm text-muted-foreground text-center space-y-2">
        <p>🟢 <strong>Real EAN-13 Barcodes:</strong> These barcodes are scannable by phone cameras and barcode readers!</p>
        <p>Print barcode labels for product identification and inventory management.</p>
        <p>Use sticker paper for best results. Each label contains product name, SKU, price, and scannable barcode.</p>
        <div className="text-xs bg-green-50 p-2 rounded border">
          <strong>Test with your phone:</strong> Point your camera at the barcode to scan it. Most phone cameras have built-in barcode scanners.
        </div>
      </div>
    </div>
  );
}
