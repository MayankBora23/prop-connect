import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutoAnalyticsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  gradient: string;
  trend?: number;
  formatValue?: boolean;
}

export function AutoAnalyticsCard({
  title,
  value,
  icon: Icon,
  gradient,
  trend,
  formatValue,
}: AutoAnalyticsCardProps) {
  const display =
    typeof value === 'number' && formatValue
      ? value >= 100000
        ? `₹${(value / 100000).toFixed(1)}L`
        : value >= 1000
          ? `₹${(value / 1000).toFixed(1)}K`
          : `₹${value.toLocaleString()}`
      : typeof value === 'number'
        ? value.toLocaleString()
        : value;

  const trendPositive = (trend ?? 0) >= 0;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border/60 p-5',
        'bg-card shadow-sm transition-all duration-300',
        'hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5'
      )}
    >
      <div
        className={cn(
          'absolute inset-0 opacity-[0.08] transition-opacity group-hover:opacity-[0.14]',
          gradient
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <p className="mt-2 truncate text-2xl font-bold text-foreground tabular-nums">{display}</p>
          {trend !== undefined && (
            <div
              className={cn(
                'mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
                trendPositive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400'
              )}
            >
              {trendPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {trendPositive ? '+' : ''}
              {trend}% today
            </div>
          )}
        </div>
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-md',
            gradient
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
