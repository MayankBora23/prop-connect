import { useRenewalPayment } from '@/hooks/useRenewalPayment';
import { useCompanySubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export function RenewalPayButton() {
  const { payRenewal, isLoading } = useRenewalPayment();
  const { data: subscription } = useCompanySubscription();
  const nextBillingAmount = subscription?.nextBillingAmount;

  return (
    <Button
      onClick={payRenewal}
      disabled={isLoading}
      className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...
        </>
      ) : (
        <>Pay Now — ₹{nextBillingAmount?.toLocaleString('en-IN')}</>
      )}
    </Button>
  );
}
