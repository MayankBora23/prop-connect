import { useState, useMemo } from 'react';
import { useLeads, useUpdateLead } from '@/hooks/useLeads';
import { useProperties, useUpdateProperty } from '@/hooks/useProperties';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfiles } from '@/hooks/useProfiles';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Home, DollarSign, CheckCircle, MoreHorizontal } from 'lucide-react';
import { PropertySuggestions } from '@/components/inbox/PropertySuggestions';
import { toast } from 'sonner';
import type { Lead } from '@/hooks/useLeads';
import type { Property } from '@/hooks/useProperties';
import { useSectionSearch } from '@/hooks/useSectionSearch';
import { filterBySearch } from '@/lib/sectionSearch';
import {
  parsePriceToNumber,
  formatPriceToShorthand,
  calculateCommission,
  isDealCompleted,
  formatCommissionAmount
} from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

function AssignLeadSelect({ leadId, assignedTo }: { leadId: string, assignedTo?: string }) {
  const { data: profiles, isLoading } = useProfiles();
  const updateLead = useUpdateLead();

  return (
    <Select
      value={assignedTo ?? 'unassigned'}
      onValueChange={value => {
        updateLead.mutate({ id: leadId, assigned_to: value === 'unassigned' ? null : value } as any);
      }}
      disabled={isLoading || updateLead.isPending}
    >
      <SelectTrigger className="h-7 w-40 text-xs bg-background">
        <SelectValue placeholder="Assign to..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {(profiles || []).map(profile => (
          <SelectItem key={profile.user_id} value={profile.user_id}>
            {profile.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}


function PropertyPurchasedCell({ lead }: { lead: Lead }) {
  const { data: properties } = useProperties();
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const updateLead = useUpdateLead();
  const updateProperty = useUpdateProperty();

  const property = properties?.find(p => p.id === lead.property_purchased_id);

  const handlePropertySelect = (property: Property) => {
    // Update the lead with property_purchased_id
    updateLead.mutate({
      id: lead.id,
      property_purchased_id: property.id
    } as any, {
      onSuccess: () => {
        // Update the property status to 'sold'
        updateProperty.mutate({
          id: property.id,
          status: 'sold'
        }, {
          onSuccess: () => {
            toast.success('Property assigned and marked as sold');
            setSuggestionsOpen(false);
          },
          onError: () => {
            toast.error('Property assigned but failed to update property status');
          }
        });
      },
      onError: (error) => {
        console.error('Error updating lead:', error);
        toast.error('Failed to assign property');
      }
    });
  };

  if (property) {
    return (
      <div className="text-sm">
        <p className="font-medium">{property.title}</p>
        <p className="text-xs text-muted-foreground">{property.location}</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setSuggestionsOpen(true)}
        className="h-8"
      >
        <Home className="w-4 h-4 mr-2" />
        Property Suggestion
      </Button>

      <PropertySuggestions
        onSelectProperty={handlePropertySelect}
        isOpen={suggestionsOpen}
        onOpenChange={setSuggestionsOpen}
      />
    </div>
  );
}

function DealPriceDialog({
  lead,
  open,
  onOpenChange
}: {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateLead = useUpdateLead();
  const [dealPrice, setDealPrice] = useState(lead.deal_price || '');

  const handleSave = () => {
    const isFirstTime = !lead.deal_price && dealPrice.trim(); // Only set timestamp if this is the first time deal_price is being set
    const updates: any = {
      id: lead.id,
      deal_price: dealPrice.trim() || null
    };

    if (isFirstTime) {
      updates.deal_closed_at = new Date().toISOString();
    }

    updateLead.mutate(updates, {
      onSuccess: () => {
        onOpenChange(false);
        setDealPrice('');
        toast.success(isFirstTime ? 'Deal price set and deal closed!' : 'Deal price updated');
      },
      onError: () => {
        toast.error('Failed to update deal price');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set Deal Price</DialogTitle>
          <DialogDescription>
            Enter the deal price for {lead.name} (e.g., 1.2Cr, 50L, 100K, or raw numbers)
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="deal-price" className="text-right">
              Deal Price
            </Label>
            <Input
              id="deal-price"
              value={dealPrice}
              onChange={(e) => setDealPrice(e.target.value)}
              placeholder="e.g., 1.2Cr, 50L, 1000000"
              className="col-span-3"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSave} disabled={updateLead.isPending}>
            {updateLead.isPending ? 'Saving...' : 'Save Price'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DealPriceCell({ lead }: { lead: Lead }) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-left justify-start"
        onClick={() => setDialogOpen(true)}
      >
        {lead.deal_price || '+'}
      </Button>
      <DealPriceDialog
        lead={lead}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}

function CommissionPctDialog({
  lead,
  field,
  open,
  onOpenChange
}: {
  lead: Lead;
  field: 'buyer_commission_pct' | 'seller_commission_pct';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateLead = useUpdateLead();
  const [value, setValue] = useState((lead as any)[field]?.toString() || '');

  const handleSave = () => {
    const numValue = parseFloat(value);
    updateLead.mutate({
      id: lead.id,
      [field]: isNaN(numValue) ? null : numValue
    } as any, {
      onSuccess: () => {
        onOpenChange(false);
        setValue('');
        toast.success(`${field === 'buyer_commission_pct' ? 'Buyer' : 'Seller'} commission updated`);
      },
      onError: () => {
        toast.error('Failed to update commission');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set {field === 'buyer_commission_pct' ? 'Buyer' : 'Seller'} Commission</DialogTitle>
          <DialogDescription>
            Set the commission percentage for {lead.name}'s deal
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="commission" className="text-right">
              Commission %
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <Input
                id="commission"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
              <span className="text-sm font-medium">%</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSave} disabled={updateLead.isPending}>
            {updateLead.isPending ? 'Saving...' : 'Save Commission'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CommissionPctCell({
  lead,
  field
}: {
  lead: Lead;
  field: 'buyer_commission_pct' | 'seller_commission_pct'
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const value = (lead as any)[field];

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 text-center"
        onClick={() => setDialogOpen(true)}
      >
        {value !== null && value !== undefined ? `${value}%` : '+'}
      </Button>
      <CommissionPctDialog
        lead={lead}
        field={field}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}

function CommissionAmountCell({ lead, type }: { lead: Lead; type: 'buyer' | 'seller' }) {
  const dealPriceNum = parsePriceToNumber(lead.deal_price);
  const commissionPct = type === 'buyer' ? (lead as any).buyer_commission_pct : (lead as any).seller_commission_pct;
  const commissionAmount = calculateCommission(dealPriceNum, commissionPct);

  return (
    <div className="text-xs text-center">
      {commissionAmount !== null ? (
        <span className="font-medium">₹{commissionAmount.toLocaleString()}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      )}
    </div>
  );
}

function PaidAmountCell({ lead, type }: { lead: Lead; type: 'buyer' | 'seller' }) {
  const paidField = type === 'buyer' ? 'buyer_paid' : 'seller_paid';
  const paidAmount = (lead as any)[paidField] || 0;

  return (
    <div className="text-xs text-center">
      <span className="font-medium">₹{paidAmount.toLocaleString()}</span>
    </div>
  );
}

function AmountPendingCell({ lead }: { lead: Lead }) {
  const dealPriceNum = parsePriceToNumber(lead.deal_price);
  const buyerCommission = calculateCommission(dealPriceNum, (lead as any).buyer_commission_pct);
  const sellerCommission = calculateCommission(dealPriceNum, (lead as any).seller_commission_pct);
  const buyerPaid = (lead as any).buyer_paid || 0;
  const sellerPaid = (lead as any).seller_paid || 0;

  const buyerRemaining = buyerCommission ? Math.max(0, buyerCommission - buyerPaid) : 0;
  const sellerRemaining = sellerCommission ? Math.max(0, sellerCommission - sellerPaid) : 0;
  const totalPending = buyerRemaining + sellerRemaining;

  return (
    <div className="text-xs text-center">
      {totalPending > 0 ? (
        <span className="font-medium text-orange-600">₹{totalPending.toLocaleString()}</span>
      ) : (
        <span className="text-green-600 font-medium">₹0</span>
      )}
    </div>
  );
}

function DealStatusCell({ lead }: { lead: Lead }) {
  const dealPriceNum = parsePriceToNumber(lead.deal_price);
  const buyerCommission = calculateCommission(dealPriceNum, (lead as any).buyer_commission_pct);
  const sellerCommission = calculateCommission(dealPriceNum, (lead as any).seller_commission_pct);
  const buyerPaid = (lead as any).buyer_paid || 0;
  const sellerPaid = (lead as any).seller_paid || 0;

  const isCompleted = isDealCompleted(buyerCommission, buyerPaid, sellerCommission, sellerPaid);
  const status = (lead as any).deal_status || 'pending';

  return (
    <div className="flex items-center gap-2">
      <span className={`text-sm font-medium ${
        isCompleted ? 'text-green-600' : status === 'completed' ? 'text-green-600' : 'text-orange-600'
      }`}>
        {status === 'completed' || isCompleted ? 'Completed' : 'Pending'}
      </span>
      {isCompleted && <CheckCircle className="w-4 h-4 text-green-600" />}
    </div>
  );
}

function AddPaymentDialog({ lead, open, onOpenChange }: { lead: Lead; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [paymentType, setPaymentType] = useState<'buyer' | 'seller'>('buyer');
  const [amount, setAmount] = useState('');
  const updateLead = useUpdateLead();

  const dealPriceNum = parsePriceToNumber(lead.deal_price);
  const buyerCommission = calculateCommission(dealPriceNum, (lead as any).buyer_commission_pct);
  const sellerCommission = calculateCommission(dealPriceNum, (lead as any).seller_commission_pct);
  const buyerPaid = (lead as any).buyer_paid || 0;
  const sellerPaid = (lead as any).seller_paid || 0;

  const buyerRemaining = buyerCommission ? Math.max(0, buyerCommission - buyerPaid) : 0;
  const sellerRemaining = sellerCommission ? Math.max(0, sellerCommission - sellerPaid) : 0;

  const handleAddPayment = () => {
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    const field = paymentType === 'buyer' ? 'buyer_paid' : 'seller_paid';
    const currentPaid = paymentType === 'buyer' ? buyerPaid : sellerPaid;
    const newPaid = currentPaid + paymentAmount;

    updateLead.mutate({
      id: lead.id,
      [field]: newPaid
    } as any, {
      onSuccess: () => {
        // Check if deal should be completed
        const isCompleted = isDealCompleted(
          buyerCommission,
          paymentType === 'buyer' ? newPaid : buyerPaid,
          sellerCommission,
          paymentType === 'seller' ? newPaid : sellerPaid
        );

          if (isCompleted) {
            updateLead.mutate({
              id: lead.id,
              deal_status: 'completed'
            } as any, {
              onSuccess: () => {
                toast.success('Payment recorded and deal completed!');
                onOpenChange(false);
                setAmount('');
              }
            });
          } else {
            toast.success('Payment recorded');
            onOpenChange(false);
            setAmount('');
          }
      },
      onError: () => {
        toast.error('Failed to record payment');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Payment</DialogTitle>
          <DialogDescription>
            Record a payment for {lead.name}'s deal
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="payment-type" className="text-right">
              Type
            </Label>
            <Select value={paymentType} onValueChange={(value: 'buyer' | 'seller') => setPaymentType(value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select payment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buyer">
                  Buyer Payment
                  {buyerRemaining > 0 && ` (₹${buyerRemaining.toLocaleString()} remaining)`}
                </SelectItem>
                <SelectItem value="seller">
                  Seller Payment
                  {sellerRemaining > 0 && ` (₹${sellerRemaining.toLocaleString()} remaining)`}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleAddPayment} disabled={updateLead.isPending}>
            {updateLead.isPending ? 'Recording...' : 'Record Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RowActions({ lead }: { lead: Lead }) {
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setPaymentDialogOpen(true)}>
            <DollarSign className="w-4 h-4 mr-2" />
            Add Payment
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AddPaymentDialog lead={lead} open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen} />
    </>
  );
}

export function PurchasedView() {
  const { data: leads, isLoading } = useLeads();
  const { search } = useSectionSearch();

  const purchasedLeads = useMemo(() => {
    const closedWon = leads?.filter((lead) => lead.stage === 'closed-won') || [];
    return filterBySearch(closedWon, search, (lead) => [
      lead.name,
      lead.phone,
      lead.email,
      lead.property_type,
      lead.location,
      lead.budget,
      lead.deal_price,
    ]);
  }, [leads, search]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1400px]">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">Assigned To</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32">Property</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deal Price</th>
              <th className="text-center px-2 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">B %</th>
              <th className="text-center px-2 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">B Comm</th>
              <th className="text-center px-2 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">B Paid</th>
              <th className="text-center px-2 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">S %</th>
              <th className="text-center px-2 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">S Comm</th>
              <th className="text-center px-2 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">S Paid</th>
              <th className="text-center px-2 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-10 w-40" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-6 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-20" /></td>
                  <td className="px-2 py-3"><Skeleton className="h-6 w-8" /></td>
                  <td className="px-2 py-3"><Skeleton className="h-6 w-12" /></td>
                  <td className="px-2 py-3"><Skeleton className="h-6 w-12" /></td>
                  <td className="px-2 py-3"><Skeleton className="h-6 w-8" /></td>
                  <td className="px-2 py-3"><Skeleton className="h-6 w-12" /></td>
                  <td className="px-2 py-3"><Skeleton className="h-6 w-12" /></td>
                  <td className="px-2 py-3"><Skeleton className="h-6 w-12" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-6 w-16" /></td>
                  <td className="px-2 py-3"><Skeleton className="h-8 w-8" /></td>
                </tr>
              ))
            ) : purchasedLeads.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-4 py-8 text-center text-muted-foreground">
                  No purchased leads found. Leads with "Closed Won" status will appear here.
                </td>
              </tr>
            ) : (
              purchasedLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-xs">
                        {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.source || 'Unknown'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-foreground">{lead.phone}</p>
                    <p className="text-xs text-muted-foreground">{lead.email || '-'}</p>
                  </td>
                  <td className="px-3 py-3">
                    <AssignLeadSelect leadId={lead.id} assignedTo={lead.assigned_to} />
                  </td>
                  <td className="px-3 py-3">
                    <PropertyPurchasedCell lead={lead} />
                  </td>
                  <td className="px-4 py-3">
                    <DealPriceCell lead={lead} />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <CommissionPctCell lead={lead} field="buyer_commission_pct" />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <CommissionAmountCell lead={lead} type="buyer" />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <PaidAmountCell lead={lead} type="buyer" />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <CommissionPctCell lead={lead} field="seller_commission_pct" />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <CommissionAmountCell lead={lead} type="seller" />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <PaidAmountCell lead={lead} type="seller" />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <AmountPendingCell lead={lead} />
                  </td>
                  <td className="px-4 py-3">
                    <DealStatusCell lead={lead} />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <RowActions lead={lead} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}