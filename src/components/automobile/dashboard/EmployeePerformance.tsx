import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, DollarSign, Target, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmployeeRow {
  id: string;
  name: string;
  avatar?: string | null;
  leadsHandled: number;
  dealsClosed: number;
  revenue: number;
  testDrives: number;
  score: number;
}

interface EmployeePerformanceProps {
  employees: EmployeeRow[];
}

export function EmployeePerformance({ employees }: EmployeePerformanceProps) {
  const best = employees[0];
  const topRevenue = [...employees].sort((a, b) => b.revenue - a.revenue)[0];
  const mostActive = [...employees].sort((a, b) => b.leadsHandled - a.leadsHandled)[0];

  const badges = [
    { label: 'Best Performer', user: best, icon: Trophy, color: 'text-amber-500' },
    { label: 'Highest Revenue', user: topRevenue, icon: DollarSign, color: 'text-emerald-500' },
    { label: 'Most Active', user: mostActive, icon: Target, color: 'text-blue-500' },
  ];

  return (
    <div className="card-elevated p-6">
      <h3 className="mb-1 text-lg font-semibold text-foreground">Employee Performance</h3>
      <p className="mb-6 text-sm text-muted-foreground">Top performers this period</p>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {badges.map((b) => (
          <div
            key={b.label}
            className="rounded-xl border border-border/60 bg-secondary/30 p-4 text-center"
          >
            <b.icon className={cn('mx-auto mb-2 h-6 w-6', b.color)} />
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {b.label}
            </p>
            <p className="mt-1 font-semibold text-foreground">{b.user?.name ?? '—'}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {employees.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No team data yet</p>
        ) : (
          employees.map((emp, i) => (
            <div
              key={emp.id}
              className="flex items-center gap-4 rounded-xl border border-border/40 p-4 transition-colors hover:bg-secondary/40"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {i + 1}
              </span>
              <Avatar className="h-10 w-10">
                <AvatarImage src={emp.avatar ?? undefined} />
                <AvatarFallback>{emp.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{emp.name}</p>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>{emp.leadsHandled} leads</span>
                  <span>{emp.dealsClosed} deals</span>
                  <span className="flex items-center gap-0.5">
                    <Calendar className="h-3 w-3" />
                    {emp.testDrives} test drives
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-600">
                  ₹{(emp.revenue / 100000).toFixed(1)}L
                </p>
                <p className="text-xs text-muted-foreground">revenue</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
