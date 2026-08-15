import { useState } from 'react';
import { format } from 'date-fns';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSubscription } from '@/hooks/useSubscription';
import { useRenewalPayment } from '@/hooks/useRenewalPayment';
import { useCurrentCompany } from '@/hooks/useCompany';
import { getCompanyId } from '@/lib/getCompanyId';
import { supabase } from '@/integrations/supabase/client';
import { BuySeatDialog } from './BuySeatDialog';
import { UpgradeDialog } from '@/components/subscription/UpgradeDialog';
import { RenewalSeatAdjuster } from './RenewalSeatAdjuster';

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function titleCase(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusBadgeClass(status: string, isActive: boolean, isTrialActive: boolean) {
  if (isActive) return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100';
  if (isTrialActive) return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100';
  if (status === 'cancelled') return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100';
  return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100';
}

function statusLabel(status: string, isActive: boolean, isTrialActive: boolean): string {
  if (isActive) return 'Active';
  if (isTrialActive) return 'Trialing';
  if (status === 'cancelled') return 'Cancelled';
  return 'Expired';
}

type PaymentRow = {
  paid_at: string | null;
  plan_slug: string;
  billing_cycle: string;
  amount_inr: number;
  status: string;
};

export function BillingView() {
  const { data: company } = useCurrentCompany();
  const { data: billing, isLoading } = useSubscription();
  const { payRenewal, isLoading: renewalLoading } = useRenewalPayment();
  const [buySeatsOpen, setBuySeatsOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['subscription-payment-history-billing'],
    queryFn: async (): Promise<PaymentRow[]> => {
      const companyId = await getCompanyId();
      if (!companyId) return [];

      const { data, error } = await (supabase as any)
        .from('subscription_payment_history')
        .select('paid_at, plan_slug, billing_cycle, amount_inr, status')
        .eq('company_id', companyId)
        .eq('status', 'completed')
        .order('paid_at', { ascending: false })
        .limit(12);

      if (error) throw error;
      return (data ?? []) as PaymentRow[];
    },
  });

  if (company?.industry === 'internal_crm') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!billing || billing.status === 'trial') {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <p className="text-muted-foreground">No active subscription</p>
            <Button onClick={() => setUpgradeOpen(true)}>Choose a plan</Button>
          </CardContent>
        </Card>
        <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
      </div>
    );
  }

  const monthlyMultiplier =
    billing.cycleType === 'yearly' ? 12 : billing.cycleType === 'quarterly' ? 3 : 1;
  const extraSeatsCost =
    billing.purchasedExtraSeats * billing.extraSeatRate * monthlyMultiplier;
  const nextAmount = billing.nextBillingAmount ?? 0;
  const totalSeats = billing.totalAllowedSeats ?? billing.planIncludedSeats;
  const seatPercent =
    totalSeats > 0 ? Math.min(100, (billing.currentMemberCount / totalSeats) * 100) : 0;

  const handleChangePlan = () => {
    setUpgradeOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-xl">
              {billing.planName ?? titleCase(billing.planSlug)} Plan
            </CardTitle>
            {billing.nextBillingDate && (
              <p className="text-sm text-muted-foreground mt-2">
                Next billing: {format(billing.nextBillingDate, 'dd MMM yyyy')}
                {billing.cycleType && (
                  <>
                    {' '}
                    · {titleCase(billing.cycleType)}
                    {nextAmount > 0 && <> · {formatInr(nextAmount)}</>}
                  </>
                )}
              </p>
            )}
            {billing.purchasedExtraSeats > 0 && billing.planBasePrice != null && (
              <p className="text-sm text-muted-foreground mt-1">
                Base plan {formatInr(billing.planBasePrice)} + {billing.purchasedExtraSeats} extra
                seats {formatInr(extraSeatsCost)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={statusBadgeClass(billing.status, billing.isActive, billing.isTrialActive)}>
              {statusLabel(billing.status, billing.isActive, billing.isTrialActive)}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleChangePlan}>
              Change Plan
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Seats used</span>
              <Button variant="outline" size="sm" onClick={() => setBuySeatsOpen(true)}>
                Buy More Seats
              </Button>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mb-2">
              <div
                className="bg-primary rounded-full h-2 transition-all"
                style={{ width: `${seatPercent}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {billing.currentMemberCount} of {totalSeats} seats used
            </p>
          </div>

          {billing.nextBillingDate && (
            <RenewalSeatAdjuster
              onPay={(adjustedExtraSeats) => payRenewal(adjustedExtraSeats)}
              isLoading={renewalLoading}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed payments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Cycle</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((row, idx) => (
                    <TableRow key={`${row.paid_at}-${idx}`}>
                      <TableCell>
                        {row.paid_at ? format(new Date(row.paid_at), 'dd MMM yyyy') : '—'}
                      </TableCell>
                      <TableCell>{titleCase(row.plan_slug)}</TableCell>
                      <TableCell>{titleCase(row.billing_cycle)}</TableCell>
                      <TableCell>{formatInr(Number(row.amount_inr))}</TableCell>
                      <TableCell className="flex items-center gap-1 text-green-700">
                        <Check className="h-4 w-4" />
                        Completed
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <BuySeatDialog open={buySeatsOpen} onOpenChange={setBuySeatsOpen} />
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
}
