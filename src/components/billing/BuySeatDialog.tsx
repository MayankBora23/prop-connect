import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useSeatPurchase } from '@/hooks/useSeatPurchase';

interface BuySeatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function BuySeatDialog({ open, onOpenChange }: BuySeatDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const { data: billing, isLoading: billingLoading } = useSubscription();
  const { purchaseSeats, isLoading } = useSeatPurchase();

  const cycleType = billing?.cycleType ?? 'monthly';
  const extraSeatRate = billing?.extraSeatRate ?? 499;
  const currentPeriodEnd = billing?.currentPeriodEnd;

  const calc = useMemo(() => {
    const monthlyMultiplier =
      cycleType === 'yearly' ? 12 : cycleType === 'quarterly' ? 3 : 1;
    const cycleDays = cycleType === 'yearly' ? 365 : cycleType === 'quarterly' ? 90 : 30;
    let remainingDays = 1;
    if (currentPeriodEnd) {
      const toISTMidnight = (date: Date) => {
        const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
        ist.setHours(0, 0, 0, 0)
        return ist
      }
      const endIST = toISTMidnight(new Date(currentPeriodEnd))
      const todayIST = toISTMidnight(new Date())
      remainingDays = Math.max(1, Math.round(
        (endIST.getTime() - todayIST.getTime()) / 86400000
      ))
    }
    const fullSeatCost = extraSeatRate * monthlyMultiplier * quantity;
    const proratedAmount = Math.round(fullSeatCost * (remainingDays / cycleDays));
    const addedPerCycle = monthlyMultiplier * extraSeatRate * quantity;
    return { monthlyMultiplier, remainingDays, fullSeatCost, proratedAmount, addedPerCycle, cycleDays };
  }, [cycleType, extraSeatRate, quantity, currentPeriodEnd]);

  const handleConfirm = async () => {
    const ok = await purchaseSeats(quantity);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Purchase Additional Seats</DialogTitle>
          <DialogDescription>
            Pay a prorated amount for the rest of your current billing period. Extra seat cost is
            added to your next renewal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="seat-quantity">Number of additional seats</Label>
            <Input
              id="seat-quantity"
              type="number"
              min={1}
              max={50}
              value={quantity}
              onChange={(e) => {
                const v = Math.min(50, Math.max(1, Number(e.target.value) || 1));
                setQuantity(v);
              }}
              disabled={billingLoading || isLoading}
            />
          </div>

          <div className="rounded-md border bg-muted/40 p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Extra users</span>
              <span>{quantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rate per user</span>
              <span>{formatInr(extraSeatRate)}/user/month</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Full cost ({cycleType})</span>
              <span>{formatInr(calc.fullSeatCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Prorated for {calc.remainingDays} days remaining
              </span>
              <span>{formatInr(calc.proratedAmount)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-medium">
              <span>Amount due today</span>
              <span>{formatInr(calc.proratedAmount)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Added to next billing</span>
              <span>+{formatInr(calc.addedPerCycle)}/cycle</span>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={isLoading || billingLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm & Pay
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
