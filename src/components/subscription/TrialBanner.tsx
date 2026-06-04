import { useState } from 'react';
import { format } from 'date-fns';
import { Clock, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCompanySubscription } from '@/hooks/useSubscription';
import { useCurrentCompany } from '@/hooks/useCompany';
import { UpgradeDialog } from './UpgradeDialog';

export function TrialBanner() {
  const { data: company } = useCurrentCompany();
  const { data: subscription } = useCompanySubscription();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (company?.industry === 'internal_crm') {
    return null;
  }

  if (!subscription) {
    return null;
  }

  const showTrial =
    subscription.isTrialActive && subscription.daysLeftInTrial <= 7;
  const showBilling =
    subscription.isActive &&
    subscription.daysUntilBilling !== null &&
    subscription.daysUntilBilling <= 5;

  if (!showTrial && !showBilling) {
    return null;
  }

  return (
    <>
      {showTrial && (
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm py-2 px-4 flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Free trial:{' '}
            <strong>
              {subscription.daysLeftInTrial} day
              {subscription.daysLeftInTrial !== 1 ? 's' : ''} remaining
            </strong>
            . Upgrade to keep your data and features.
          </span>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs font-semibold"
            onClick={() => setUpgradeOpen(true)}
          >
            Upgrade Now
          </Button>
        </div>
      )}
      {showBilling && subscription.next_billing_date && (
        <div className="bg-blue-50 border-b border-blue-200 text-blue-800 text-sm py-2 px-4 flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Your <strong>{subscription.plan_name}</strong> plan renews in{' '}
            <strong>{subscription.daysUntilBilling} days</strong> on{' '}
            {format(new Date(subscription.next_billing_date), 'dd MMM yyyy')}.
          </span>
          <button
            type="button"
            className="text-xs text-blue-600 hover:underline"
            onClick={() => setUpgradeOpen(true)}
          >
            Manage Plan
          </button>
        </div>
      )}
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </>
  );
}
