import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { DashboardDateFilter } from '@/hooks/useAutomobileDashboard';
import { CalendarRange } from 'lucide-react';
import { format } from 'date-fns';

const FILTERS: { id: DashboardDateFilter; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'year', label: 'This Year' },
];

interface DashboardFiltersProps {
  dateFilter: DashboardDateFilter;
  onFilterChange: (f: DashboardDateFilter) => void;
  customFrom?: Date;
  customTo?: Date;
  onCustomRange?: (from: Date, to: Date) => void;
}

export function DashboardFilters({
  dateFilter,
  onFilterChange,
  customFrom,
  customTo,
  onCustomRange,
}: DashboardFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {FILTERS.map((f) => (
        <Button
          key={f.id}
          variant={dateFilter === f.id ? 'default' : 'outline'}
          size="sm"
          className={cn(
            'rounded-full',
            dateFilter === f.id && 'gradient-primary border-0 text-primary-foreground shadow-md'
          )}
          onClick={() => onFilterChange(f.id)}
        >
          {f.label}
        </Button>
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={dateFilter === 'custom' ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'rounded-full gap-1.5',
              dateFilter === 'custom' && 'gradient-primary border-0 text-primary-foreground'
            )}
          >
            <CalendarRange className="h-4 w-4" />
            Custom
            {customFrom && customTo && dateFilter === 'custom' && (
              <span className="ml-1 text-xs opacity-90">
                {format(customFrom, 'dd MMM')} – {format(customTo, 'dd MMM')}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={
              customFrom && customTo ? { from: customFrom, to: customTo } : undefined
            }
            onSelect={(range) => {
              if (range?.from && range?.to && onCustomRange) {
                onFilterChange('custom');
                onCustomRange(range.from, range.to);
              }
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
