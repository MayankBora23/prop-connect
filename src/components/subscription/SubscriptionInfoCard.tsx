import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useCompanySubscription,
  useSubscriptionPaymentHistory,
} from '@/hooks/useSubscription';
import { useCurrentCompany } from '@/hooks/useCompany';
import { UpgradeDialog } from './UpgradeDialog';

const planBadgeClass: Record<string, string> = {
  trial: 'bg-blue-100 text-blue-800 border-blue-200',
  starter: 'bg-green-100 text-green-800 border-green-200',
  growth: 'bg-blue-100 text-blue-800 border-blue-200',
  pro: 'bg-purple-100 text-purple-800 border-purple-200',
  enterprise: 'bg-red-100 text-red-800 border-red-200',
};

function statusBadge(sub: NonNullable<ReturnType<typeof useCompanySubscription>['data']>) {
  if (sub.isActive) {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
        Active
      </Badge>
    );
  }
  if (sub.isTrialExpired || sub.isBlocked) {
    return (
      <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">Expired</Badge>
    );
  }
  return (
    <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">Trial</Badge>
  );
}

function paymentStatusBadge(status: string) {
  if (status === 'completed') {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
        Completed
      </Badge>
    );
  }
  if (status === 'failed') {
    return (
      <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">Failed</Badge>
    );
  }
  return (
    <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
      Pending
    </Badge>
  );
}

export function SubscriptionInfoCard() {
  const { data: company } = useCurrentCompany();
  const { data: subscription, isLoading } = useCompanySubscription();
  const { data: payments = [], isLoading: paymentsLoading } = useSubscriptionPaymentHistory(5);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (company?.industry === 'internal_crm') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="card-elevated p-6 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!subscription) {
    return null;
  }

  const daysUsed = Math.min(7, 7 - subscription.daysLeftInTrial);
  const trialProgress = (daysUsed / 7) * 100;
  const planSlug = subscription.plan_slug || 'trial';
  const displayPlanName = subscription.plan_name || (planSlug === 'trial' ? 'Free Trial' : planSlug);

  return (
    <>
      <div className="card-elevated p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(planBadgeClass[planSlug] ?? planBadgeClass.trial)}
            >
              {displayPlanName}
            </Badge>
            {statusBadge(subscription)}
          </div>
          <Button
            variant="outline"
            className="gradient-primary border-0 text-primary-foreground"
            onClick={() => setUpgradeOpen(true)}
          >
            {subscription.isActive ? 'Change Plan' : 'Upgrade Plan'}
          </Button>
        </div>

        {subscription.isTrialActive && (
          <div className="space-y-2">
            <p className="text-2xl font-semibold text-foreground">
              {subscription.daysLeftInTrial} day
              {subscription.daysLeftInTrial !== 1 ? 's' : ''} remaining in your free trial
            </p>
            <Progress
              value={trialProgress}
              className={cn(
                'h-2',
                subscription.daysLeftInTrial <= 2 && '[&>div]:bg-destructive'
              )}
            />
            <p className="text-xs text-muted-foreground">
              Day {daysUsed} of 7 · Ends{' '}
              {format(new Date(subscription.trial_ends_at), 'dd MMM yyyy')}
            </p>
          </div>
        )}

        {subscription.isActive && subscription.next_billing_date && (
          <div className="space-y-1">
            <p className="text-lg font-medium">
              Next billing: {format(subscription.nextBillingDate!, 'dd MMM yyyy')}
            </p>
            <p className="text-sm text-muted-foreground capitalize">
              {subscription.billing_cycle} plan
              {subscription.amount_paid != null &&
                ` · ${Number(subscription.amount_paid).toLocaleString('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0,
                })}`}
            </p>
            {subscription.included_users != null && (
              <p className="text-xs text-muted-foreground">
                Plan includes {subscription.included_users} users
              </p>
            )}
          </div>
        )}

        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold mb-3">Payment History</h4>
          {paymentsLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Plan</th>
                    <th className="pb-2 pr-4">Cycle</th>
                    <th className="pb-2 pr-4">Amount</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((row: Record<string, unknown>) => (
                    <tr key={String(row.id)} className="border-b border-border/50">
                      <td className="py-2 pr-4">
                        {format(
                          new Date((row.paid_at as string) || (row.created_at as string)),
                          'dd MMM yyyy'
                        )}
                      </td>
                      <td className="py-2 pr-4 capitalize">{String(row.plan_slug)}</td>
                      <td className="py-2 pr-4 capitalize">{String(row.billing_cycle)}</td>
                      <td className="py-2 pr-4">
                        ₹{Number(row.amount_inr).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2">{paymentStatusBadge(String(row.status))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </>
  );
}
