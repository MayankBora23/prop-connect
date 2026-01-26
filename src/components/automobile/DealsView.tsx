import { useState } from 'react';
import { useDeals, useUpdateDeal } from '@/hooks/useDeals';
import { useGenerateInvoice } from '@/hooks/useDealInvoices';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Filter, Download, Upload, Briefcase, DollarSign, Edit, Trash2, FileText, Truck, CreditCard, Receipt, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDeleteDeal } from '@/hooks/useDeals';
import { EditDealDialog } from './EditDealDialog';
import { DealInvoiceDialog } from './DealInvoiceDialog';
import { toast } from 'sonner';
import type { DealWithRelations } from '@/hooks/useAutoTypes';

export function DealsView() {
  const { data: deals, isLoading, error } = useDeals();
  const deleteDeal = useDeleteDeal();
  const updateDeal = useUpdateDeal();
  const generateInvoice = useGenerateInvoice();

  const [editDealOpen, setEditDealOpen] = useState(false);
  const [selectedDealForEdit, setSelectedDealForEdit] = useState<DealWithRelations | null>(null);
  const [invoiceDealOpen, setInvoiceDealOpen] = useState(false);
  const [selectedDealForInvoice, setSelectedDealForInvoice] = useState<DealWithRelations | null>(null);


  const handleDelete = async (dealId: string, dealNumber: string) => {
    try {
      await deleteDeal.mutateAsync(dealId);
      toast.success(`Deal ${dealNumber} has been deleted successfully`);
    } catch (error) {
      toast.error(`Failed to delete deal ${dealNumber}`);
    }
  };

  const handleGenerateInvoice = async (deal: DealWithRelations) => {
    // First ensure the invoice exists, then open the dialog
    try {
      await generateInvoice.mutateAsync({
        dealId: deal.id,
        invoiceType: 'customer_invoice',
        dealData: deal,
      });
      // Open the invoice dialog to show/print/download
      setSelectedDealForInvoice(deal);
      setInvoiceDealOpen(true);
    } catch (error: any) {
      console.error('Generate invoice error:', error);
      toast.error(`Failed to generate invoice: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleUpdateDeliveryStatus = async (dealId: string, newStatus: 'pending' | 'ready' | 'delivered' | 'cancelled', dealNumber: string) => {
    try {
      await updateDeal.mutateAsync({
        id: dealId,
        delivery_status: newStatus,
      });
      toast.success(`Delivery status updated to ${newStatus} for deal ${dealNumber}`);
    } catch (error: any) {
      console.error('Update delivery status error:', error);
      toast.error(`Failed to update delivery status: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleEditDeal = (deal: DealWithRelations) => {
    setSelectedDealForEdit(deal);
    setEditDealOpen(true);
  };

  const getDealStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'delivered': return 'bg-emerald-100 text-emerald-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-orange-100 text-orange-800';
      case 'pending': return 'bg-red-100 text-red-800';
      case 'overdue': return 'bg-red-200 text-red-900';
      case 'refunded': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'ready': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Deals</h2>
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

      {/* Deals List */}
      <div className="card-elevated overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deal #</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vehicle</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Amount</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Delivery</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-10 w-40" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-6 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-6 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-6 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-20" /></td>
                </tr>
              ))
            ) : !deals || deals.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  No deals found. Create your first deal to get started.
                  <br />
                  <small className="text-xs">
                    Debug: {error ? `Error: ${error.message}` : 'No error'}
                    {deals && ` | Array length: ${deals.length}`}
                  </small>
                </td>
              </tr>
            ) : (
              (deals || []).map((deal: DealWithRelations) => (
                <tr key={deal.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <span className="text-sm font-medium text-foreground block">
                          {deal.deal_number || `D-${deal.id.slice(-6)}`}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(deal.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-xs">
                        {deal.customer_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'U'}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {deal.customer_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {deal.customer_phone}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {deal.vehicle_year} {deal.vehicle_brand} {deal.vehicle_model}
                      </p>
                      {deal.vehicle_variant && (
                        <p className="text-xs text-muted-foreground">
                          {deal.vehicle_variant}
                        </p>
                      )}
                      {deal.vehicle_color && (
                        <p className="text-xs text-muted-foreground">
                          Color: {deal.vehicle_color}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <span className="text-sm font-medium text-foreground block">
                          ₹{(deal.total_on_road_price || 0).toLocaleString()}
                        </span>
                        {deal.finance_type !== 'none' && (
                          <span className="text-xs text-blue-600">
                            Financed: ₹{(deal.financed_amount || 0).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <Badge className={getPaymentStatusColor(deal.payment_status)}>
                        {deal.payment_status}
                      </Badge>
                      <div className="text-xs text-muted-foreground">
                        Paid: ₹{(deal.total_paid || 0).toLocaleString()}
                        {(deal.balance_amount || 0) > 0 && (
                          <span className="text-red-600 ml-1">
                            Bal: ₹{(deal.balance_amount || 0).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <Badge className={getDeliveryStatusColor(deal.delivery_status)}>
                        {deal.delivery_status}
                      </Badge>
                      {deal.delivery_date && (
                        <div className="text-xs text-muted-foreground">
                          {new Date(deal.delivery_date).toLocaleDateString()}
                        </div>
                      )}
                      {!deal.delivery_date && (
                        <div className="text-xs text-muted-foreground">
                          No date set
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <Badge className={getDealStatusColor(deal.deal_status)}>
                        {deal.deal_status}
                      </Badge>
                      {deal.finance_type !== 'none' && (
                        <div className="text-xs text-blue-600 flex items-center gap-1">
                          <CreditCard className="w-3 h-3" />
                          {deal.finance_type.replace('_', ' ')}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Generate Invoice"
                        onClick={() => handleGenerateInvoice(deal)}
                        disabled={generateInvoice.isPending}
                      >
                        <Receipt className="h-4 w-4" />
                      </Button>
                      <Select
                        value={deal.delivery_status}
                        onValueChange={(value) => handleUpdateDeliveryStatus(deal.id, value as 'pending' | 'ready' | 'delivered' | 'cancelled', deal.deal_number || `D-${deal.id.slice(-6)}`)}
                      >
                        <SelectTrigger className="h-8 w-8 p-0 border-0 bg-transparent text-green-600 hover:text-green-700 hover:bg-green-50">
                          <Truck className="h-4 w-4" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="ready">Ready</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        title="Edit Deal"
                        onClick={() => handleEditDeal(deal)}
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
                            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete deal {deal.deal_number || `D-${deal.id.slice(-6)}`}?
                              This action cannot be undone and will also delete all associated invoices and payments.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(deal.id, deal.deal_number || `D-${deal.id.slice(-6)}`)}
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

      <EditDealDialog
        deal={selectedDealForEdit}
        open={editDealOpen}
        onOpenChange={(open) => {
          setEditDealOpen(open);
          if (!open) setSelectedDealForEdit(null);
        }}
      />

      <DealInvoiceDialog
        deal={selectedDealForInvoice}
        open={invoiceDealOpen}
        onOpenChange={(open) => {
          setInvoiceDealOpen(open);
          if (!open) setSelectedDealForInvoice(null);
        }}
      />
    </div>
  );
}
