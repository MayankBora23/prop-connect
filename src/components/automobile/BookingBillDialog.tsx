import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Download, Printer, X } from 'lucide-react';
import { useCurrentCompany } from '@/hooks/useCompany';
import type { BookingWithRelations } from '@/hooks/useAutoTypes';

interface BookingBillDialogProps {
  booking: BookingWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookingBillDialog({ booking, open, onOpenChange }: BookingBillDialogProps) {
  const { data: company } = useCurrentCompany();
  const printRef = useRef<HTMLDivElement>(null);

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
    if (printRef.current) {
      // Create a simple HTML to PDF download
      const billContent = printRef.current.innerHTML;
      const blob = new Blob([`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Booking Invoice - ${booking?.booking_number || `B-${booking?.id.slice(-6)}`}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .company-info { margin-bottom: 30px; }
            .bill-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .customer-info, .booking-info { flex: 1; }
            .pricing-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .pricing-table th, .pricing-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .pricing-table th { background-color: #f2f2f2; }
            .total-row { font-weight: bold; background-color: #f9f9f9; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          ${billContent}
        </body>
        </html>
      `], { type: 'text/html' });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `booking-invoice-${booking?.booking_number || booking?.id.slice(-6)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (!booking) return null;

  const totalAmount = (booking.vehicle_price || 0) +
                     (booking.accessories_cost || 0) +
                     (booking.registration_cost || 0) +
                     (booking.insurance_cost || 0) +
                     (booking.finance_cost || 0) -
                     (booking.discount_amount || 0);

  const remainingBalance = totalAmount - (booking.down_payment || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Booking Invoice</DialogTitle>
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

        <div ref={printRef} className="bg-white p-8 print:p-0">
          {/* Header */}
          <div className="header">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">VEHICLE BOOKING INVOICE</h1>
            <p className="text-gray-600">Invoice #{booking.booking_number || `B-${booking.id.slice(-6)}`}</p>
            <p className="text-gray-600">Date: {new Date(booking.booking_date).toLocaleDateString()}</p>
          </div>

          {/* Company Information */}
          <div className="company-info">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">From</h2>
            <div className="text-gray-700">
              <p className="font-bold text-lg">{company?.name || 'Company Name'}</p>
              {company?.address && <p>{company?.address}</p>}
              {company?.phone && <p>Phone: {company?.phone}</p>}
              {company?.email && <p>Email: {company?.email}</p>}
            </div>
          </div>

          {/* Bill Details */}
          <div className="bill-details">
            <div className="customer-info">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Bill To</h3>
              <div className="text-gray-700">
                <p className="font-semibold">{booking.auto_leads?.name || 'Customer Name'}</p>
                <p>{booking.auto_leads?.phone || 'Phone: N/A'}</p>
                <p>{booking.auto_leads?.email || 'Email: N/A'}</p>
                {booking.delivery_location && <p>Delivery Address: {booking.delivery_location}</p>}
              </div>
            </div>

            <div className="booking-info">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Booking Details</h3>
              <div className="text-gray-700 space-y-1">
                <p><span className="font-medium">Booking Date:</span> {new Date(booking.booking_date).toLocaleDateString()}</p>
                {booking.delivery_date && <p><span className="font-medium">Delivery Date:</span> {new Date(booking.delivery_date).toLocaleDateString()}</p>}
                <p><span className="font-medium">Status:</span> <span className="capitalize">{booking.status}</span></p>
                <p><span className="font-medium">Payment Status:</span> <span className="capitalize">{booking.payment_status}</span></p>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Vehicle Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Vehicle Details</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-semibold text-lg">
                {booking.vehicles?.year} {booking.vehicles?.brand} {booking.vehicles?.model}
                {booking.vehicles?.variant && ` (${booking.vehicles?.variant})`}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                <div>
                  <span className="font-medium">Fuel Type:</span> {booking.vehicles?.fuel_type}
                </div>
                <div>
                  <span className="font-medium">Transmission:</span> {booking.vehicles?.transmission}
                </div>
                {booking.vehicles?.mileage && (
                  <div>
                    <span className="font-medium">Mileage:</span> {booking.vehicles.mileage} kmpl
                  </div>
                )}
                {booking.vehicles?.color && (
                  <div>
                    <span className="font-medium">Color:</span> {booking.vehicles.color}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Pricing Breakdown</h3>
            <div className="overflow-x-auto">
<table className="pricing-table">

              <thead>
                <tr>
                  <th>Description</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Vehicle Price</td>
                  <td className="text-right">₹{booking.vehicle_price.toLocaleString()}</td>
                </tr>
                {booking.discount_amount > 0 && (
                  <tr>
                    <td>Discount</td>
                    <td className="text-right text-red-600">-₹{booking.discount_amount.toLocaleString()}</td>
                  </tr>
                )}
                {booking.accessories_cost > 0 && (
                  <tr>
                    <td>Accessories</td>
                    <td className="text-right">₹{booking.accessories_cost.toLocaleString()}</td>
                  </tr>
                )}
                {booking.registration_cost > 0 && (
                  <tr>
                    <td>Registration</td>
                    <td className="text-right">₹{booking.registration_cost.toLocaleString()}</td>
                  </tr>
                )}
                {booking.insurance_cost > 0 && (
                  <tr>
                    <td>Insurance</td>
                    <td className="text-right">₹{booking.insurance_cost.toLocaleString()}</td>
                  </tr>
                )}
                {booking.finance_cost > 0 && (
                  <tr>
                    <td>Finance Cost</td>
                    <td className="text-right">₹{booking.finance_cost.toLocaleString()}</td>
                  </tr>
                )}
                <tr className="border-t-2">
                  <td className="font-semibold">Subtotal</td>
                  <td className="text-right font-semibold">₹{totalAmount.toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Down Payment</td>
                  <td className="text-right">-₹{(booking.down_payment || 0).toLocaleString()}</td>
                </tr>
                <tr className="total-row">
                  <td className="font-bold text-lg">Remaining Balance</td>
                  <td className="text-right font-bold text-lg">₹{remainingBalance.toLocaleString()}</td>
                </tr>
              </tbody>
            
</table>
</div>
          </div>

          {/* Special Requests */}
          {booking.special_requests && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Special Requests</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">{booking.special_requests}</p>
              </div>
            </div>
          )}

          {/* Terms & Conditions */}
          {booking.terms_conditions && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Terms & Conditions</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 whitespace-pre-wrap">{booking.terms_conditions}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          {booking.notes && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Additional Notes</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 whitespace-pre-wrap">{booking.notes}</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="footer">
            <p>Thank you for your business!</p>
            <p>This is a computer-generated invoice and does not require a signature.</p>
            <p className="mt-4 text-xs">
              Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
