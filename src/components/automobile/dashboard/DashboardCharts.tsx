import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const ChartsInner = lazy(() =>
  import('./DashboardChartsInner').then((m) => ({ default: m.DashboardChartsInner }))
);

export interface DashboardChartsProps {
  revenueTrend: { month: string; revenue: number }[];
  vehicleSalesByMonth: { month: string; sold: number }[];
  paymentCollection: { name: string; value: number; color: string }[];
  leadFunnel: { stage: string; count: number; fill: string }[];
  testDriveConversionChart: { name: string; value: number }[];
}

export function DashboardCharts(props: DashboardChartsProps) {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-2xl" />
          ))}
        </div>
      }
    >
      <ChartsInner {...props} />
    </Suspense>
  );
}
