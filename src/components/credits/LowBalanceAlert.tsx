import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/hooks/useWallet';
import { useIndustry } from '@/hooks/useIndustry';
import { AlertTriangle } from 'lucide-react';
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

export function LowBalanceAlert() {
  const { data: wallet, isLoading } = useWallet();
  const { data: industry, isLoaded: industryLoaded } = useIndustry();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');

  if (!industryLoaded || isLoading || !wallet || industry === 'internal_crm') return null;

  const balance = Number(wallet.balance);
  const min = Number(wallet.min_balance_threshold);

  if (balance >= min) return null;

  return (
    <>
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Low balance</AlertTitle>
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Low balance: ₹{balance.toFixed(2)} — WhatsApp messages are blocked. Recharge to continue.
          </span>
          <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={() => setOpen(true)}>
            Recharge
          </Button>
        </AlertDescription>
      </Alert>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recharge credits</DialogTitle>
            <DialogDescription>Payment integration coming soon.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="lowbal-amount">Amount (INR)</Label>
            <Input
              id="lowbal-amount"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
