import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { Loader2, Plus, Minus } from 'lucide-react';

interface RenewalSeatAdjusterProps {
  onPay: (adjustedExtraSeats: number) => void;
  isLoading: boolean;
}

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function RenewalSeatAdjuster({ onPay, isLoading }: RenewalSeatAdjusterProps) {
  const { data: billing, isLoading: isSubscriptionLoading } = useSubscription();

  const planIncludedSeats = billing?.planIncludedSeats ?? 0;
  const purchasedExtraSeats = billing?.purchasedExtraSeats ?? 0;
  const extraSeatRate = billing?.extraSeatRate ?? 499;
  const cycleType = billing?.cycleType ?? 'monthly';
  const currentMemberCount = billing?.currentMemberCount ?? 0;
  const planBasePrice = billing?.planBasePrice ?? 0;

  const [extraSeats, setExtraSeats] = useState<number>(0);

  useEffect(() => {
    if (billing) {
      setExtraSeats(billing.purchasedExtraSeats);
    }
  }, [billing]);

  const minExtraSeats = useMemo(() => {
    return Math.max(0, currentMemberCount - planIncludedSeats);
  }, [currentMemberCount, planIncludedSeats]);

  const monthlyMultiplier = useMemo(() => {
    return cycleType === 'yearly' ? 12 : cycleType === 'quarterly' ? 3 : 1;
  }, [cycleType]);

  const extraSeatsCost = useMemo(() => {
    return extraSeats * extraSeatRate * monthlyMultiplier;
  }, [extraSeats, extraSeatRate, monthlyMultiplier]);

  const totalAmount = useMemo(() => {
    return Math.round((planBasePrice ?? 0) + extraSeatsCost);
  }, [planBasePrice, extraSeatsCost]);

  const newTotalSeats = useMemo(() => {
    return planIncludedSeats + extraSeats;
  }, [planIncludedSeats, extraSeats]);

  if (isSubscriptionLoading) {
    return (
      <div className="flex items-center justify-center p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm space-y-4 w-full">
      <div className="space-y-1">
        <h3 className="font-semibold text-lg leading-none tracking-tight text-center sm:text-left">
          Adjust extra seats for next billing cycle
        </h3>
        <p className="text-sm text-muted-foreground text-center sm:text-left">
          Plan includes: {planIncludedSeats} seats · Current team: {currentMemberCount} members
        </p>
      </div>

      <div className="flex flex-col gap-4 py-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-medium text-muted-foreground">Extra seats</span>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setExtraSeats((prev) => Math.max(minExtraSeats, prev - 1))}
              disabled={extraSeats <= minExtraSeats || isLoading}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="w-12 h-9 flex items-center justify-center rounded-md border bg-background font-medium text-sm">
              {extraSeats}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setExtraSeats((prev) => Math.min(999, prev + 1))}
              disabled={extraSeats >= 999 || isLoading}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Total seats next cycle</span>
          <span className="font-medium">{newTotalSeats}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Extra cost ({cycleType})</span>
          <span className="font-medium">{formatInr(extraSeatsCost)}/cycle</span>
        </div>
      </div>

      <hr className="border-t" />

      <div className="flex justify-between items-center font-semibold text-lg">
        <span>Total due</span>
        <span>{formatInr(totalAmount)}</span>
      </div>

      {extraSeats === 0 && (
        <p className="text-xs text-muted-foreground italic text-center">
          Next billing will be base plan only — {formatInr(planBasePrice)}
        </p>
      )}

      {extraSeats === minExtraSeats && minExtraSeats > 0 && (
        <p className="text-xs text-amber-600 font-medium text-center bg-amber-50 border border-amber-200 rounded p-2">
          Minimum {minExtraSeats} extra seat(s) required for your current team of {currentMemberCount} members
        </p>
      )}

      <Button
        type="button"
        className="w-full font-semibold py-6 text-base"
        onClick={() => onPay(extraSeats)}
        disabled={isLoading}
      >
        {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
        Pay {formatInr(totalAmount)} for next cycle
      </Button>
    </div>
  );
}
