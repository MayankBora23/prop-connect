import { useState } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCompanySubscription } from '@/hooks/useSubscription';
import { useCurrentCompany } from '@/hooks/useCompany';
import { UpgradeDialog } from './UpgradeDialog';

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { data: company } = useCurrentCompany();
  const { data: subscription, isLoading } = useCompanySubscription();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (company?.industry === 'internal_crm') {
    return <>{children}</>;
  }

  if (isLoading) {
    return <>{children}</>;
  }

  if (!subscription) {
    return <>{children}</>;
  }

  if (!subscription.isBlocked) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <Lock className="w-10 h-10 text-destructive" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-foreground">Trial Ended</h2>
          <p className="text-muted-foreground text-lg">
            Your 7-day free trial has ended. Upgrade to continue using AiLeadX.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="bg-muted rounded-xl p-3 text-center">
            <div className="font-bold text-lg text-foreground">₹2,499</div>
            <div className="text-muted-foreground">Starter/mo</div>
          </div>
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
            <div className="font-bold text-lg text-primary">₹6,999</div>
            <div className="text-muted-foreground">Growth/mo ⭐</div>
          </div>
          <div className="bg-muted rounded-xl p-3 text-center">
            <div className="font-bold text-lg text-foreground">₹14,999</div>
            <div className="text-muted-foreground">Pro/mo</div>
          </div>
        </div>
        <Button
          className="w-full gradient-primary border-0 h-12 text-base font-semibold"
          onClick={() => setUpgradeOpen(true)}
        >
          Upgrade Now — Choose a Plan
        </Button>
        <p className="text-xs text-muted-foreground">
          Need more time? Contact{' '}
          <a href="mailto:support@aileadx.in" className="text-primary hover:underline">
            support@aileadx.in
          </a>
        </p>
      </div>
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
}
