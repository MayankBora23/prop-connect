import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/hooks/useWallet';
import { useCurrentCompany } from '@/hooks/useCompany';
import { Skeleton } from '@/components/ui/skeleton';
import { RechargeDialog } from './RechargeDialog';

export function WalletCard() {
  const { data: wallet, isLoading } = useWallet();
  const { data: company } = useCurrentCompany();
  const [rechargeOpen, setRechargeOpen] = useState(false);

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

      <RechargeDialog open={rechargeOpen} onOpenChange={setRechargeOpen} />
    </>
  );
}
