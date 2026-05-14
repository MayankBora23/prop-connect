import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TicketCategory, TicketPriority, TicketStatus } from '@/types/support';

const statusClass: Record<TicketStatus, string> = {
  open: 'bg-blue-100 text-blue-700 border-transparent',
  in_progress: 'bg-yellow-100 text-yellow-700 border-transparent',
  resolved: 'bg-green-100 text-green-700 border-transparent',
  closed: 'bg-gray-100 text-gray-600 border-transparent',
};

const statusLabel: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge variant="outline" className={cn('font-medium', statusClass[status])}>
      {statusLabel[status]}
    </Badge>
  );
}

const priorityClass: Record<TicketPriority, string> = {
  low: 'bg-green-100 text-green-700 border-transparent',
  medium: 'bg-yellow-100 text-yellow-700 border-transparent',
  high: 'bg-orange-100 text-orange-700 border-transparent',
  urgent: 'bg-red-100 text-red-700 border-transparent',
};

const priorityLabel: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <Badge variant="outline" className={cn('font-medium', priorityClass[priority])}>
      {priorityLabel[priority]}
    </Badge>
  );
}

const categoryLabel: Record<TicketCategory, string> = {
  bug: 'Bug',
  feature_request: 'Feature Request',
  help: 'Help',
  integration: 'Integration',
  billing: 'Billing',
  other: 'Other',
};

export function CategoryBadge({ category }: { category: TicketCategory }) {
  return (
    <Badge variant="outline" className="border-slate-200 bg-slate-100 text-slate-700 font-medium">
      {categoryLabel[category]}
    </Badge>
  );
}
