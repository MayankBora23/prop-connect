import { RenewalSeatAdjuster } from './RenewalSeatAdjuster';
import { useRenewalPayment } from '@/hooks/useRenewalPayment';

export function RenewalPayButton() {
  const { payRenewal, isLoading } = useRenewalPayment();
  return (
    <RenewalSeatAdjuster
      onPay={(adjustedExtraSeats) => payRenewal(adjustedExtraSeats)}
      isLoading={isLoading}
    />
  );
}
