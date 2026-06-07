import { useState } from 'react';
import { Lock, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCompanySubscription } from '@/hooks/useSubscription';
import { useCurrentCompany } from '@/hooks/useCompany';
import { UpgradeDialog } from './UpgradeDialog';
import { format } from 'date-fns';
import { RenewalPayButton } from '@/components/billing/RenewalPayButton';

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

  if (!subscription.isBlocked && !subscription.isPaymentOverdue) {
    return <>{children}</>;
  }

  return (
    <>
      {subscription.isBlocked && (
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
        </div>
      )}

      {subscription.isPaymentOverdue && (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-lg w-full text-center space-y-6">

            {/* Same icon style as trial expired */}
            <CreditCard className="w-12 h-12 text-orange-500 mx-auto mb-4" />

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Payment Overdue
            </h2>
            <p className="text-gray-600 mb-6">
              Your {subscription.plan_name} plan payment was due on{' '}
              {subscription.next_billing_date && format(new Date(subscription.next_billing_date), 'dd MMM yyyy')}.
              Please pay to continue using AiLeadX.
            </p>

            {/* Amount due — same style as plan price cards in trial expired */}
            <div className="flex justify-center gap-4 mb-6">
              <div className="border-2 border-orange-500 rounded-lg p-4 text-center bg-orange-50">
                <div className="text-2xl font-bold text-orange-600">
                  ₹{subscription.nextBillingAmount?.toLocaleString('en-IN')}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {subscription.plan_name} / {subscription.billingCycle}
                </div>
                {subscription.purchasedExtraSeats > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    Base ₹{subscription.planBasePrice?.toLocaleString('en-IN')}
                    + {subscription.purchasedExtraSeats} extra seats
                  </div>
                )}
              </div>
            </div>

            {/* Pay Now button — triggers same Razorpay flow as BillingView Pay Now */}
            <RenewalPayButton />

            <p className="text-sm text-gray-500 mt-4">
              Need help? Contact{' '}
              <a href="mailto:support@aileadx.in" className="text-blue-600 hover:underline">
                support@aileadx.in
              </a>
            </p>
          </div>
        </div>
      )}
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </>
  );
}
