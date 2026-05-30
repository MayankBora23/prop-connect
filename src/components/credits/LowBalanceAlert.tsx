import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/hooks/useWallet';
import { useIndustry } from '@/hooks/useIndustry';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { RechargeDialog } from './RechargeDialog';

export function LowBalanceAlert() {
  const { data: wallet, isLoading } = useWallet();
  const { data: industry, isLoaded: industryLoaded } = useIndustry();
  const [rechargeOpen, setRechargeOpen] = useState(false);

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
          <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={() => setRechargeOpen(true)}>
            Recharge
          </Button>
        </AlertDescription>
      </Alert>

      <RechargeDialog open={rechargeOpen} onOpenChange={setRechargeOpen} />
    </>
  );
}
