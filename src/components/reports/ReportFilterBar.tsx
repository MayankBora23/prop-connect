import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type ReportFilterBarProps = {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  customFrom: Date | null;
  customTo: Date | null;
  onCustomRangeChange: (from: Date, to: Date) => void;
};

export function ReportFilterBar({
  activeFilter,
  onFilterChange,
  customFrom,
  customTo,
  onCustomRangeChange,
}: ReportFilterBarProps) {
  const [fromStr, setFromStr] = useState('');
  const [toStr, setToStr] = useState('');

  useEffect(() => {
    if (customFrom) setFromStr(customFrom.toISOString().slice(0, 10));
    else setFromStr('');
  }, [customFrom]);

  useEffect(() => {
    if (customTo) setToStr(customTo.toISOString().slice(0, 10));
    else setToStr('');
  }, [customTo]);

  const onCustomRangeChangeRef = useRef(onCustomRangeChange);
  onCustomRangeChangeRef.current = onCustomRangeChange;

  useEffect(() => {
    if (activeFilter !== 'custom') return;
    if (!fromStr || !toStr) return;
    const from = new Date(fromStr + 'T00:00:00');
    const to = new Date(toStr + 'T00:00:00');
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return;
    onCustomRangeChangeRef.current(from, to);
  }, [activeFilter, fromStr, toStr]);

  const filters = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'year', label: 'This Year' },
    { id: 'custom', label: 'Custom' },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button
            key={f.id}
            type="button"
            variant={activeFilter === f.id ? 'default' : 'outline'}
            size="sm"
            className={cn(activeFilter === f.id && 'shadow-sm')}
            onClick={() => onFilterChange(f.id)}
          >
            {f.label}
          </Button>
        ))}
      </div>
      {activeFilter === 'custom' && (
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="team-report-from">From</Label>
            <Input
              id="team-report-from"
              type="date"
              value={fromStr}
              onChange={(e) => setFromStr(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="team-report-to">To</Label>
            <Input
              id="team-report-to"
              type="date"
              value={toStr}
              onChange={(e) => setToStr(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
