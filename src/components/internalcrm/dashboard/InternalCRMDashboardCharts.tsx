import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const ChartsInner = lazy(() =>
  import('./InternalCRMDashboardChartsInner').then((m) => ({
    default: m.InternalCRMDashboardChartsInner,
  }))
);

export interface InternalCRMDashboardChartsProps {
  revenueTrend: { month: string; revenue: number }[];
  signupsByMonth: { month: string; signups: number }[];
  planDistribution: { name: string; value: number; color: string }[];
  leadFunnel: { stage: string; count: number; fill: string }[];
  demoConversionChart: { name: string; value: number }[];
}

export function InternalCRMDashboardCharts(props: InternalCRMDashboardChartsProps) {
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
