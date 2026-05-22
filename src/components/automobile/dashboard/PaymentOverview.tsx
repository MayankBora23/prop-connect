import { AutoAnalyticsCard } from './AutoAnalyticsCard';
import { Wallet, Clock, AlertCircle, CreditCard } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PaymentRow {
  id: string;
  customer: string;
  vehicle: string;
  total: number;
  paid: number;
  remaining: number;
  dueDate: string;
  status: string;
}

interface PaymentOverviewProps {
  collected: number;
  remaining: number;
  overdue: number;
  emiPending: number;
  rows: PaymentRow[];
}

const statusVariant: Record<string, string> = {
  completed: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  partial: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  pending: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  overdue: 'bg-red-500/10 text-red-700 dark:text-red-400',
};

export function PaymentOverview({
  collected,
  remaining,
  overdue,
  emiPending,
  rows,
}: PaymentOverviewProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AutoAnalyticsCard
          title="Total Collected"
          value={collected}
          formatValue
          icon={Wallet}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
        />
        <AutoAnalyticsCard
          title="Remaining"
          value={remaining}
          formatValue
          icon={Clock}
          gradient="bg-gradient-to-br from-amber-500 to-orange-600"
        />
        <AutoAnalyticsCard
          title="Overdue"
          value={overdue}
          icon={AlertCircle}
          gradient="bg-gradient-to-br from-red-500 to-rose-600"
        />
        <AutoAnalyticsCard
          title="EMI Pending"
          value={emiPending}
          icon={CreditCard}
          gradient="bg-gradient-to-br from-violet-500 to-purple-600"
        />
      </div>

      <div className="card-elevated overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-semibold text-foreground">Payment Summary</h3>
          <p className="text-sm text-muted-foreground">Outstanding and partial payments</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No pending payments
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.customer}</TableCell>
                    <TableCell className="text-muted-foreground">{row.vehicle}</TableCell>
                    <TableCell className="text-right">₹{row.total.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-emerald-600">
                      ₹{row.paid.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-amber-600">
                      ₹{row.remaining.toLocaleString()}
                    </TableCell>
                    <TableCell>{row.dueDate}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn('capitalize', statusVariant[row.status] ?? '')}
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
