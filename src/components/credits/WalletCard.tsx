import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/hooks/useWallet';
import { useCurrentCompany } from '@/hooks/useCompany';
import { Skeleton } from '@/components/ui/skeleton';
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

export function WalletCard() {
  const { data: wallet, isLoading } = useWallet();
  const { data: company } = useCurrentCompany();
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [amount, setAmount] = useState('');

  const balance = wallet ? Number(wallet.balance) : 0;
  const minThreshold = wallet ? Number(wallet.min_balance_threshold) : 50;
  const provider = company?.whatsapp_provider === 'meta' ? 'meta' : 'twilio';
  const healthy = balance >= minThreshold;

  return (
    <>
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">Credits Balance</CardTitle>
          <Badge variant={provider === 'meta' ? 'default' : 'secondary'} className="capitalize">
            {provider === 'meta' ? 'Meta WhatsApp' : 'Twilio WhatsApp'}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-12 w-48" />
          ) : (
            <>
              <p className="text-4xl font-bold tracking-tight">₹{balance.toFixed(2)}</p>
              <div className="flex flex-wrap items-center gap-2">
                {healthy ? (
                  <Badge variant="outline" className="border-green-600 text-green-700 dark:border-green-500 dark:text-green-400">
                    Healthy
                  </Badge>
                ) : (
                  <Badge variant="destructive">Low Balance — services blocked</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Min required: ₹{minThreshold.toFixed(2)}</p>
              <Button type="button" onClick={() => setRechargeOpen(true)}>
                Recharge
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={rechargeOpen} onOpenChange={setRechargeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add credits</DialogTitle>
            <DialogDescription>
              Payment integration coming soon. Enter an amount to save for when billing goes live.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="amount">Amount (INR)</Label>
            <Input
              id="amount"
              type="number"
              min={0}
              placeholder="500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRechargeOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
