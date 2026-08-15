import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Download, Printer, X, FileText } from 'lucide-react';
import { useCurrentCompany } from '@/hooks/useCompany';
import { useDealInvoices } from '@/hooks/useDealInvoices';
import { useGenerateInvoice } from '@/hooks/useDealInvoices';
import type { DealWithRelations } from '@/hooks/useAutoTypes';

interface DealInvoiceDialogProps {
  deal?: DealWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DealInvoiceDialog({ deal, open, onOpenChange }: DealInvoiceDialogProps) {
  const { data: company } = useCurrentCompany();
  const { data: invoices } = useDealInvoices(deal?.id);
  const generateInvoice = useGenerateInvoice();
  const printRef = useRef<HTMLDivElement>(null);

  // Generate invoices when dialog opens
  useEffect(() => {
    if (deal && open && invoices) {
      const generateMissingInvoices = async () => {
        try {
          // Generate customer invoice if it doesn't exist
          if (!invoices.find(inv => inv.invoice_type === 'customer_invoice')) {
            await generateInvoice.mutateAsync({
              dealId: deal.id,
              invoiceType: 'customer_invoice',
              dealData: deal,
            });
          }

          // Generate finance invoice if financed and doesn't exist
          if (deal.finance_type !== 'none' && !invoices.find(inv => inv.invoice_type === 'finance_invoice')) {
            await generateInvoice.mutateAsync({
              dealId: deal.id,
              invoiceType: 'finance_invoice',
              dealData: deal,
            });
          }

          // Generate delivery note if delivery date exists and doesn't exist
          if (deal.delivery_date && !invoices.find(inv => inv.invoice_type === 'delivery_note')) {
            await generateInvoice.mutateAsync({
              dealId: deal.id,
              invoiceType: 'delivery_note',
              dealData: deal,
            });
          }
        } catch (error) {
          console.error('Error generating invoices:', error);
        }
      };

      generateMissingInvoices();
    }
  }, [deal, open, invoices, generateInvoice]);

  const customerInvoice = invoices?.find(inv => inv.invoice_type === 'customer_invoice');
  const financeInvoice = invoices?.find(inv => inv.invoice_type === 'finance_invoice');
  const deliveryNote = invoices?.find(inv => inv.invoice_type === 'delivery_note');

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML;
      const originalContent = document.body.innerHTML;

      document.body.innerHTML = printContent;
      window.print();
      document.body.innerHTML = originalContent;

      // Reload the page to restore React state
      window.location.reload();
    }
  };

  const handleDownload = () => {
    if (printRef.current && deal) {
      const invoiceContent = printRef.current.innerHTML;
      const blob = new Blob([`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Deal Invoice - ${deal.deal_number || `D-${deal.id.slice(-6)}`}</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 20px;
              line-height: 1.6;
              color: #333;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #2563eb;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .company-info {
              margin-bottom: 30px;
              text-align: center;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 5px;
            }
            .company-details {
              font-size: 14px;
              color: #666;
            }
            .invoice-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
              background: #f8fafc;
              padding: 20px;
              border-radius: 8px;
            }
            .invoice-info, .customer-info {
              flex: 1;
            }
            .invoice-title {
              font-size: 28px;
              font-weight: bold;
              color: #1f2937;
              margin-bottom: 10px;
            }
            .invoice-number {
              font-size: 16px;
              color: #6b7280;
              margin-bottom: 5px;
            }
            .invoice-date {
              font-size: 14px;
              color: #6b7280;
            }
            .section-title {
              font-size: 18px;
              font-weight: bold;
              color: #1f2937;
              margin: 30px 0 15px 0;
              padding-bottom: 5px;
              border-bottom: 2px solid #e5e7eb;
            }
            .customer-details {
              background: #f9fafb;
              padding: 15px;
              border-radius: 6px;
              margin-bottom: 20px;
            }
            .customer-details p {
              margin: 5px 0;
              font-size: 14px;
            }
            .vehicle-details {
              background: #fef3c7;
              padding: 15px;
              border-radius: 6px;
              margin-bottom: 20px;
              border-left: 4px solid #f59e0b;
            }
            .pricing-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
              border-radius: 6px;
              overflow: hidden;
            }
            .pricing-table th, .pricing-table td {
              border: 1px solid #e5e7eb;
              padding: 12px 15px;
              text-align: left;
            }
            .pricing-table th {
              background: #f3f4f6;
              font-weight: 600;
              color: #374151;
            }
            .pricing-table tbody tr:hover {
              background: #f9fafb;
            }
            .total-row {
              font-weight: bold;
              background: #dbeafe !important;
              border-top: 2px solid #3b82f6;
            }
            .gst-breakdown {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
              gap: 15px;
              margin: 20px 0;
            }
            .gst-item {
              background: #ecfdf5;
              padding: 15px;
              border-radius: 6px;
              text-align: center;
              border: 1px solid #d1fae5;
            }
            .gst-label {
              font-size: 12px;
              color: #6b7280;
              margin-bottom: 5px;
            }
            .gst-value {
              font-size: 16px;
              font-weight: bold;
              color: #065f46;
            }
            .finance-details {
              background: #fef3c7;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #f59e0b;
            }
            .finance-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 15px;
              margin-top: 15px;
            }
            .finance-item {
              text-align: center;
            }
            .finance-label {
              font-size: 12px;
              color: #6b7280;
              margin-bottom: 5px;
            }
            .finance-value {
              font-size: 16px;
              font-weight: bold;
              color: #92400e;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 12px;
              color: #6b7280;
              border-top: 1px solid #e5e7eb;
              padding-top: 20px;
            }
            .terms {
              background: #f8fafc;
              padding: 15px;
              border-radius: 6px;
              margin: 20px 0;
              font-size: 12px;
              color: #6b7280;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${invoiceContent}
        </body>
        </html>
      `], { type: 'text/html' });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `deal-invoice-${deal.deal_number || deal.id.slice(-6)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (!deal) return null;

  const invoiceData = customerInvoice?.invoice_data;
  const financeData = financeInvoice?.invoice_data;
  const deliveryData = deliveryNote?.invoice_data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Deal Invoices - {deal.deal_number || `D-${deal.id.slice(-6)}`}
          </DialogTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div ref={printRef} className="space-y-6">
          {/* Company Header */}
          <div className="header">
            <div className="company-info">
              <div className="company-name">{company?.name || 'Your Company'}</div>
              <div className="company-details">
                {company?.address && <div>{company.address}</div>}
                {company?.phone && <div>Phone: {company.phone}</div>}
                {company?.email && <div>Email: {company.email}</div>}
              </div>
            </div>
          </div>

          {/* Customer Invoice */}
          {customerInvoice && (
            <div className="invoice-section">
              <div className="invoice-header">
                <div className="invoice-info">
                  <div className="invoice-title">CUSTOMER INVOICE</div>
                  <div className="invoice-number">
                    Invoice #: {customerInvoice.invoice_number}
                  </div>
                  <div className="invoice-date">
                    Date: {new Date(customerInvoice.invoice_date).toLocaleDateString()}
                  </div>
                </div>
                <div className="customer-info">
                  <h4 className="font-semibold mb-2">Bill To:</h4>
                  <div className="text-sm">
                    <div className="font-medium">{deal.customer_name}</div>
                    <div>{deal.customer_phone}</div>
                    {deal.customer_email && <div>{deal.customer_email}</div>}
                    {deal.customer_address && (
                      <div>
                        {deal.customer_address}
                        {deal.customer_city && `, ${deal.customer_city}`}
                        {deal.customer_state && `, ${deal.customer_state}`}
                        {deal.customer_pincode && ` - ${deal.customer_pincode}`}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Vehicle Details */}
              <div className="vehicle-details">
                <h4 className="font-semibold mb-2">Vehicle Details:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Vehicle:</span> {deal.vehicle_year} {deal.vehicle_brand} {deal.vehicle_model}
                    {deal.vehicle_variant && ` (${deal.vehicle_variant})`}
                  </div>
                  <div>
                    <span className="font-medium">Color:</span> {deal.vehicle_color || 'Not specified'}
                  </div>
                  {deal.chassis_number && (
                    <div>
                      <span className="font-medium">Chassis Number:</span> {deal.chassis_number}
                    </div>
                  )}
                  {deal.engine_number && (
                    <div>
                      <span className="font-medium">Engine Number:</span> {deal.engine_number}
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing Breakdown */}
              <h3 className="section-title">Price Breakdown</h3>
              <div className="overflow-x-auto">
<table className="pricing-table">

                <thead>
                  <tr>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Ex-Showroom Price</td>
                    <td style={{ textAlign: 'right' }}>{deal.ex_showroom_price.toLocaleString()}</td>
                  </tr>
                  {deal.rto_charges > 0 && (
                    <tr>
                      <td>RTO Charges</td>
                      <td style={{ textAlign: 'right' }}>{deal.rto_charges.toLocaleString()}</td>
                    </tr>
                  )}
                  {deal.insurance_charges > 0 && (
                    <tr>
                      <td>Insurance Charges</td>
                      <td style={{ textAlign: 'right' }}>{deal.insurance_charges.toLocaleString()}</td>
                    </tr>
                  )}
                  {deal.accessories_cost > 0 && (
                    <tr>
                      <td>Accessories Cost</td>
                      <td style={{ textAlign: 'right' }}>{deal.accessories_cost.toLocaleString()}</td>
                    </tr>
                  )}
                  {deal.other_charges > 0 && (
                    <tr>
                      <td>Other Charges</td>
                      <td style={{ textAlign: 'right' }}>{deal.other_charges.toLocaleString()}</td>
                    </tr>
                  )}
                  {deal.discount_amount > 0 && (
                    <tr>
                      <td>Discount</td>
                      <td style={{ textAlign: 'right' }}>-{deal.discount_amount.toLocaleString()}</td>
                    </tr>
                  )}
                  <tr className="total-row">
                    <td><strong>Total On-Road Price</strong></td>
                    <td style={{ textAlign: 'right' }}><strong>₹{deal.total_on_road_price.toLocaleString()}</strong></td>
                  </tr>
                </tbody>
              
</table>
</div>

              {/* GST Breakdown */}
              {(deal.cgst_amount > 0 || deal.sgst_amount > 0 || deal.igst_amount > 0) && (
                <>
                  <h3 className="section-title">GST Breakdown</h3>
                  <div className="gst-breakdown">
                    {deal.cgst_amount > 0 && (
                      <div className="gst-item">
                        <div className="gst-label">CGST ({deal.cgst_rate}%)</div>
                        <div className="gst-value">₹{deal.cgst_amount.toLocaleString()}</div>
                      </div>
                    )}
                    {deal.sgst_amount > 0 && (
                      <div className="gst-item">
                        <div className="gst-label">SGST ({deal.sgst_rate}%)</div>
                        <div className="gst-value">₹{deal.sgst_amount.toLocaleString()}</div>
                      </div>
                    )}
                    {deal.igst_amount > 0 && (
                      <div className="gst-item">
                        <div className="gst-label">IGST ({deal.igst_rate}%)</div>
                        <div className="gst-value">₹{deal.igst_amount.toLocaleString()}</div>
                      </div>
                    )}
                    <div className="gst-item">
                      <div className="gst-label">Total GST</div>
                      <div className="gst-value">₹{deal.total_gst_amount.toLocaleString()}</div>
                    </div>
                  </div>
                </>
              )}

              {/* Payment Information */}
              <h3 className="section-title">Payment Summary</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Payment Made</h4>
                  <div className="overflow-x-auto">
<table className="pricing-table">

                    <tbody>
                      {deal.token_amount > 0 && (
                        <tr>
                          <td>Token Amount</td>
                          <td style={{ textAlign: 'right' }}>₹{deal.token_amount.toLocaleString()}</td>
                        </tr>
                      )}
                      {deal.down_payment > 0 && (
                        <tr>
                          <td>Down Payment</td>
                          <td style={{ textAlign: 'right' }}>₹{deal.down_payment.toLocaleString()}</td>
                        </tr>
                      )}
                      <tr className="total-row">
                        <td><strong>Total Paid</strong></td>
                        <td style={{ textAlign: 'right' }}><strong>₹{deal.total_paid.toLocaleString()}</strong></td>
                      </tr>
                    </tbody>
                  
</table>
</div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Payment Due</h4>
                  <div className="text-2xl font-bold text-red-600">
                    ₹{deal.balance_amount.toLocaleString()}
                  </div>
                  {deal.finance_type !== 'none' && (
                    <div className="text-sm text-blue-600 mt-2">
                      Financed Amount: ₹{deal.financed_amount.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Finance Invoice */}
          {financeInvoice && deal.finance_type !== 'none' && (
            <div className="invoice-section">
              <div className="invoice-header">
                <div className="invoice-info">
                  <div className="invoice-title">FINANCE INVOICE</div>
                  <div className="invoice-number">
                    Invoice #: {financeInvoice.invoice_number}
                  </div>
                  <div className="invoice-date">
                    Date: {new Date(financeInvoice.invoice_date).toLocaleDateString()}
                  </div>
                </div>
                <div className="customer-info">
                  <h4 className="font-semibold mb-2">Finance Company:</h4>
                  <div className="text-sm">
                    <div className="font-medium">{deal.finance_company_name}</div>
                    {deal.finance_company_address && <div>{deal.finance_company_address}</div>}
                  </div>
                </div>
              </div>

              <div className="finance-details">
                <h4 className="font-semibold mb-3">Finance Details</h4>
                <div className="finance-grid">
                  <div className="finance-item">
                    <div className="finance-label">Loan Amount</div>
                    <div className="finance-value">₹{deal.loan_amount?.toLocaleString()}</div>
                  </div>
                  <div className="finance-item">
                    <div className="finance-label">Tenure</div>
                    <div className="finance-value">{deal.loan_tenure_months} months</div>
                  </div>
                  <div className="finance-item">
                    <div className="finance-label">Interest Rate</div>
                    <div className="finance-value">{deal.interest_rate}%</div>
                  </div>
                  <div className="finance-item">
                    <div className="finance-label">EMI Amount</div>
                    <div className="finance-value">₹{deal.emi_amount?.toLocaleString()}</div>
                  </div>
                  {deal.processing_fee > 0 && (
                    <div className="finance-item">
                      <div className="finance-label">Processing Fee</div>
                      <div className="finance-value">₹{deal.processing_fee.toLocaleString()}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Delivery Note */}
          {deliveryNote && (
            <div className="invoice-section">
              <div className="invoice-header">
                <div className="invoice-info">
                  <div className="invoice-title">DELIVERY NOTE</div>
                  <div className="invoice-number">
                    Note #: {deliveryNote.invoice_number}
                  </div>
                  <div className="invoice-date">
                    Date: {new Date(deliveryNote.invoice_date).toLocaleDateString()}
                  </div>
                </div>
                <div className="customer-info">
                  <h4 className="font-semibold mb-2">Delivery To:</h4>
                  <div className="text-sm">
                    <div className="font-medium">{deal.customer_name}</div>
                    <div>{deal.customer_phone}</div>
                    {deal.delivery_location && <div>Location: {deal.delivery_location}</div>}
                    {deal.delivery_date && <div>Delivery Date: {new Date(deal.delivery_date).toLocaleDateString()}</div>}
                  </div>
                </div>
              </div>

              {deal.delivery_notes && (
                <div className="terms">
                  <h4 className="font-semibold mb-2">Delivery Notes:</h4>
                  <p>{deal.delivery_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Terms and Conditions */}
          {(deal.special_conditions || deal.payment_terms) && (
            <div className="terms">
              {deal.special_conditions && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-2">Special Conditions:</h4>
                  <p>{deal.special_conditions}</p>
                </div>
              )}
              {deal.payment_terms && (
                <div>
                  <h4 className="font-semibold mb-2">Payment Terms:</h4>
                  <p>{deal.payment_terms}</p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="footer">
            <p>This is a computer-generated invoice and does not require a signature.</p>
            <p>For any queries, please contact us at {company?.phone || 'your contact number'}.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}