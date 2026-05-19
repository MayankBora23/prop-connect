import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CallAnalyticsFilterBarProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  customFrom?: Date | null;
  customTo?: Date | null;
  onCustomRangeChange: (from: Date | null, to: Date | null) => void;
}

const filters = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: 'last7days' },
  { label: 'This Month', value: 'thismonth' },
  { label: 'Last Month', value: 'lastmonth' },
  { label: 'Custom', value: 'custom' },
];

export function CallAnalyticsFilterBar({
  activeFilter,
  onFilterChange,
  customFrom,
  customTo,
  onCustomRangeChange,
}: CallAnalyticsFilterBarProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Button
            key={filter.value}
            variant={activeFilter === filter.value ? 'default' : 'outline'}
            onClick={() => onFilterChange(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>
      {activeFilter === 'custom' && (
        <div className="flex gap-2">
          <Input
            type="date"
            value={customFrom ? customFrom.toISOString().split('T')[0] : ''}
            onChange={(e) => onCustomRangeChange(e.target.value ? new Date(e.target.value) : null, customTo)}
          />
          <Input
            type="date"
            value={customTo ? customTo.toISOString().split('T')[0] : ''}
            onChange={(e) => onCustomRangeChange(customFrom, e.target.value ? new Date(e.target.value) : null)}
          />
        </div>
      )}
    </div>
  );
}
