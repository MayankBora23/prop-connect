import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useSubscriptionPlans,
  useCreateSubscriptionOrder,
  useConfirmSubscriptionPayment,
  useCompanySubscription,
  type BillingCycle,
  type SubscriptionPlan,
} from '@/hooks/useSubscription';
import { useCurrentProfile } from '@/hooks/useProfiles';
import { supabase } from '@/integrations/supabase/client';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PaymentStatus = 'idle' | 'creating' | 'open' | 'verifying' | 'success' | 'failed';

type RazorpayPaymentFailed = {
  error?: { description?: string; reason?: string };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: 'payment.failed', handler: (response: RazorpayPaymentFailed) => void) => void;
};

type RazorpayCheckout = new (options: Record<string, unknown>) => RazorpayInstance;

function getRazorpay(): RazorpayCheckout {
  const ctor = (window as unknown as { Razorpay?: RazorpayCheckout }).Razorpay;
  if (!ctor) throw new Error('Razorpay SDK not loaded');
  return ctor;
}

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function planPrice(plan: SubscriptionPlan, cycle: BillingCycle): number {
  if (cycle === 'monthly') return Number(plan.monthly_price);
  if (cycle === 'quarterly') return Number(plan.quarterly_price);
  return Number(plan.yearly_price);
}

function priceLabel(plan: SubscriptionPlan, cycle: BillingCycle): string {
  if (plan.is_custom) return 'Custom';
  const price = planPrice(plan, cycle);
  if (cycle === 'monthly') return `${formatInr(price)}/mo`;
  if (cycle === 'quarterly') return `${formatInr(price)}/qtr`;
  return `${formatInr(price)}/yr`;
}

const planAccent: Record<string, string> = {
  starter: 'text-green-600 border-green-200',
  growth: 'text-blue-600 border-blue-200',
  pro: 'text-purple-600 border-purple-200',
  enterprise: 'text-red-600 border-red-200',
};

export function UpgradeDialog({ open, onOpenChange }: UpgradeDialogProps) {
  const { data: plans = [], isLoading: plansLoading } = useSubscriptionPlans();
  const { data: subscription } = useCompanySubscription();
  const createOrderMutation = useCreateSubscriptionOrder();
  const confirmMutation = useConfirmSubscriptionPayment();
  const { data: profile } = useCurrentProfile();

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedPlanData = plans.find((p) => p.slug === selectedPlan);
  const payAmount = selectedPlanData ? planPrice(selectedPlanData, billingCycle) : 0;

  const dialogModal =
    paymentStatus === 'idle' ||
    paymentStatus === 'creating' ||
    paymentStatus === 'failed' ||
    paymentStatus === 'success';

  const handleOpenChange = (next: boolean) => {
    if (paymentStatus === 'open' || paymentStatus === 'verifying') return;
    if (!next) {
      setSelectedPlan(null);
      setBillingCycle('monthly');
      setPaymentStatus('idle');
      setErrorMessage(null);
    }
    onOpenChange(next);
  };

  const handlePay = async () => {
    if (!selectedPlan || !selectedPlanData || selectedPlanData.is_custom) return;
    setPaymentStatus('creating');
    setErrorMessage(null);

    try {
      const order = await createOrderMutation.mutateAsync({
        plan_slug: selectedPlan,
        billing_cycle: billingCycle,
      });

      if (!(window as unknown as { Razorpay?: RazorpayCheckout }).Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Razorpay'));
          document.head.appendChild(script);
        });
      }

      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      const RazorpayCtor = getRazorpay();
      const rzp = new RazorpayCtor({
        key: order.key_id,
        order_id: order.order_id,
        amount: order.amount,
        currency: order.currency,
        name: 'AiLeadX',
        description: `${order.plan_name} — ${billingCycle}`,
        prefill: {
          name: profile?.name ?? undefined,
          email: user?.email ?? undefined,
        },
        handler: async () => {
          setPaymentStatus('verifying');
          try {
            await confirmMutation.mutateAsync();
            setPaymentStatus('success');
          } catch {
            setErrorMessage(
              'Payment received — your plan may take a moment to activate. Refresh if needed.'
            );
            setPaymentStatus('failed');
          }
        },
        modal: {
          ondismiss: () => setPaymentStatus('idle'),
          escape: true,
          backdropclose: true,
        },
        theme: { color: '#6366f1' },
      });

      rzp.on('payment.failed', (response) => {
        setErrorMessage(
          response.error?.description?.trim() ||
            response.error?.reason?.trim() ||
            'Payment failed. Please try again.'
        );
        setPaymentStatus('failed');
      });

      setPaymentStatus('open');
      rzp.open();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Payment failed. Please try again.');
      setPaymentStatus('failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={dialogModal}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
        {paymentStatus === 'success' ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold">{selectedPlanData?.name} Plan Activated</h3>
            <p className="text-muted-foreground">Your plan is now active! Enjoy AiLeadX.</p>
            <Button className="gradient-primary border-0" onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div className="space-y-2">
                <DialogTitle className="text-2xl">Choose Your Plan</DialogTitle>
                {subscription?.isTrialActive && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
                    Trial ends in {subscription.daysLeftInTrial} day
                    {subscription.daysLeftInTrial !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </DialogHeader>

            <div className="flex flex-wrap gap-2 p-1 bg-muted rounded-full w-fit">
              {(
                [
                  { id: 'monthly' as const, label: 'Monthly' },
                  { id: 'quarterly' as const, label: 'Quarterly', save: 'Save ~7%' },
                  { id: 'yearly' as const, label: 'Yearly', save: 'Save ~17%' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setBillingCycle(opt.id)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium transition-all',
                    billingCycle === opt.id
                      ? 'bg-background shadow text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {opt.label}
                  {'save' in opt && opt.save && (
                    <span className="ml-1 text-xs text-primary">({opt.save})</span>
                  )}
                </button>
              ))}
            </div>

            {plansLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plans.map((plan) => {
                  const isSelected = selectedPlan === plan.slug;
                  const isCurrent =
                    subscription?.isActive && subscription.plan_slug === plan.slug;
                  return (
                    <div
                      key={plan.id}
                      className={cn(
                        'relative border rounded-xl p-4 space-y-3',
                        isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                      )}
                    >
                      {plan.slug === 'growth' && (
                        <Badge className="absolute -top-2 right-3 bg-primary text-primary-foreground">
                          Most Popular
                        </Badge>
                      )}
                      {isCurrent && (
                        <Badge className="absolute -top-2 left-3 bg-green-100 text-green-800 border-green-200">
                          Current Plan
                        </Badge>
                      )}
                      <div className="flex items-center justify-between">
                        <h3
                          className={cn(
                            'text-lg font-bold',
                            planAccent[plan.slug]?.split(' ')[0]
                          )}
                        >
                          {plan.name}
                        </h3>
                        <span className="text-lg font-semibold">{priceLabel(plan, billingCycle)}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {plan.is_custom ? 'Unlimited users' : `${plan.included_users} users included`}
                      </Badge>
                      {!plan.is_custom && plan.extra_user_price_monthly > 0 && (
                        <p className="text-xs text-muted-foreground">
                          +{formatInr(Number(plan.extra_user_price_monthly))}/mo per extra user
                        </p>
                      )}
                      <ul className="space-y-1.5 text-sm">
                        {plan.features.slice(0, 5).map((f) => (
                          <li key={f} className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      {plan.is_custom ? (
                        <Button variant="outline" className="w-full" asChild>
                          <a href="mailto:support@aileadx.in?subject=Enterprise Plan Inquiry">
                            Contact Sales
                          </a>
                        </Button>
                      ) : isCurrent ? null : (
                        <Button
                          variant={isSelected ? 'default' : 'outline'}
                          className={cn('w-full', isSelected && 'gradient-primary border-0')}
                          onClick={() => setSelectedPlan(plan.slug)}
                          disabled={!!isCurrent}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="border-t pt-4 space-y-3">
              {paymentStatus === 'failed' && (
                <p className="text-sm text-destructive text-center">{errorMessage}</p>
              )}
              {paymentStatus === 'open' || paymentStatus === 'verifying' ? (
                <p className="text-center text-sm text-muted-foreground">
                  Complete payment in the Razorpay window…
                </p>
              ) : selectedPlanData && !selectedPlanData.is_custom ? (
                <>
                  <p className="text-sm text-muted-foreground text-center">
                    {selectedPlanData.name} · {billingCycle} billing
                  </p>
                  <Button
                    className="w-full gradient-primary border-0 h-12 text-base font-semibold"
                    disabled={!selectedPlan || paymentStatus !== 'idle'}
                    onClick={handlePay}
                  >
                    {paymentStatus === 'creating' && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {paymentStatus === 'creating'
                      ? 'Creating order...'
                      : `Pay ${formatInr(payAmount)} via Razorpay`}
                  </Button>
                </>
              ) : null}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
