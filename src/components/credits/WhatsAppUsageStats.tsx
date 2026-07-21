import { useCurrentMonthStats, useDailyCreditsLast30Days } from '@/hooks/useWallet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function WhatsAppUsageStats() {
  const { data: monthStats, isLoading: mLoading } = useCurrentMonthStats();
  const { data: daily, isLoading: dLoading } = useDailyCreditsLast30Days();

  const loading = mLoading || dLoading;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-[200px] w-full rounded-lg" />
      </div>
    );
  }

  const chartData =
    daily?.map((d) => ({
      ...d,
      label: d.date.slice(5),
    })) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Messages This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{monthStats?.total_messages ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Twilio Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{monthStats?.twilio_messages ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Meta Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{monthStats?.meta_messages ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Credits Used This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₹{(monthStats?.total_credits_deducted ?? 0).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Call Minutes This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{monthStats?.call_minutes ?? 0} min</p>
            <p className="text-xs text-muted-foreground">{monthStats?.call_count ?? 0} calls</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Call Credits Used</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₹{(monthStats?.call_credits_used ?? 0).toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="w-full" style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={40} />
            <Tooltip formatter={(v: number) => [`₹${Number(v).toFixed(2)}`, 'Credits']} />
            <Bar dataKey="credits" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function formatMessageCategory(
  category: string | null,
  provider: string | null
): string {
  if (provider === 'meta') return 'WhatsApp Message (Meta)';
  if (category === 'marketing') return 'Marketing';
  if (category === 'utility') return 'Utility';
  if (category === 'service') return 'Service';
  if (category === 'authentication') return 'Authentication';
  if (category === 'platform_fee') return 'Platform Fee';
  return category ?? 'Message';
}

