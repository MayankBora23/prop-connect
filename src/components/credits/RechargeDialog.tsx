import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useRazorpayRecharge } from '@/hooks/useRazorpayRecharge';
import { Loader2, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RechargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

export function RechargeDialog({
  open,
  onOpenChange,
  title = 'Recharge credits',
}: RechargeDialogProps) {
  const [amount, setAmount] = useState('');
  const { recharge, loading, quickAmounts } = useRazorpayRecharge();

  const handlePay = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 10) return;
    const ok = await recharge(value);
    if (ok) {
      setAmount('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Pay securely with Razorpay. Credits are added instantly after payment.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex flex-wrap gap-2">
            {quickAmounts.map((q) => (
              <Button
                key={q}
                type="button"
                variant={amount === String(q) ? 'default' : 'outline'}
                size="sm"
                className="rounded-full"
                onClick={() => setAmount(String(q))}
                disabled={loading}
              >
                ₹{q}
              </Button>
            ))}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="recharge-amount">Amount (INR)</Label>
            <Input
              id="recharge-amount"
              type="number"
              min={10}
              step={1}
              placeholder="500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">Minimum ₹10</p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handlePay}
            disabled={loading || !amount || Number(amount) < 10}
            className={cn('gradient-primary border-0')}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : (
              <>Pay ₹{amount || '0'}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
