import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DashboardChartsProps } from './DashboardCharts';

const CHART_TOOLTIP = {
  contentStyle: {
    borderRadius: '12px',
    border: '1px solid hsl(var(--border))',
    background: 'hsl(var(--card))',
  },
};

export function DashboardChartsInner({
  revenueTrend,
  vehicleSalesByMonth,
  paymentCollection,
  leadFunnel,
  testDriveConversionChart,
}: DashboardChartsProps) {
  const totalPayments = paymentCollection.reduce((s, p) => s + p.value, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card-elevated p-6">
          <h3 className="mb-1 font-semibold text-foreground">Revenue Trend</h3>
          <p className="mb-4 text-sm text-muted-foreground">Monthly revenue growth</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                {...CHART_TOOLTIP}
                formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Revenue']}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="hsl(230, 80%, 55%)"
                strokeWidth={3}
                dot={{ fill: 'hsl(230, 80%, 55%)', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card-elevated p-6">
          <h3 className="mb-1 font-semibold text-foreground">Vehicle Sales</h3>
          <p className="mb-4 text-sm text-muted-foreground">Vehicles sold per month</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={vehicleSalesByMonth}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip {...CHART_TOOLTIP} />
              <Bar dataKey="sold" fill="hsl(142, 76%, 36%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card-elevated p-6">
          <h3 className="mb-1 font-semibold text-foreground">Payment Collection</h3>
          <p className="mb-4 text-sm text-muted-foreground">Paid · Partial · Pending</p>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={paymentCollection}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
                nameKey="name"
              >
                {paymentCollection.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip {...CHART_TOOLTIP} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            {paymentCollection.map((p) => (
              <div key={p.name} className="flex items-center gap-2 text-sm">
                <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />
                <span className="text-muted-foreground">
                  {p.name}: {totalPayments ? Math.round((p.value / totalPayments) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-elevated p-6">
          <h3 className="mb-1 font-semibold text-foreground">Lead Conversion Funnel</h3>
          <p className="mb-4 text-sm text-muted-foreground">Leads at each pipeline stage</p>
          {leadFunnel.every((s) => s.count === 0) ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              No leads in pipeline yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={leadFunnel}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="stage"
                  width={88}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  {...CHART_TOOLTIP}
                  formatter={(value: number) => [value, 'Leads']}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={36}>
                  {leadFunnel.map((entry) => (
                    <Cell key={entry.stage} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card-elevated p-6 lg:max-w-xl">
        <h3 className="mb-1 font-semibold text-foreground">Test Drive vs Booking</h3>
        <p className="mb-4 text-sm text-muted-foreground">Conversion overview</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={testDriveConversionChart} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
            <Tooltip {...CHART_TOOLTIP} />
            <Bar dataKey="value" fill="hsl(199, 89%, 48%)" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
