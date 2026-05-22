import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Car, Package, AlertTriangle } from 'lucide-react';
import type { VehicleWithRelations } from '@/hooks/useAutoTypes';

const COLORS = [
  'hsl(230, 80%, 55%)',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(199, 89%, 48%)',
  'hsl(280, 65%, 60%)',
];

interface InventoryInsightsProps {
  totalValue: number;
  fastMoving: VehicleWithRelations[];
  unsold: VehicleWithRelations[];
  recentlyAdded: VehicleWithRelations[];
  lowStock: VehicleWithRelations[];
  brandInventory: { brand: string; count: number }[];
  categoryDistribution: { name: string; value: number }[];
}

export function InventoryInsights({
  totalValue,
  fastMoving,
  unsold,
  recentlyAdded,
  lowStock,
  brandInventory,
  categoryDistribution,
}: InventoryInsightsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/60 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 p-5">
          <Package className="mb-2 h-8 w-8 text-blue-600" />
          <p className="text-sm text-muted-foreground">Total Inventory Value</p>
          <p className="text-2xl font-bold">₹{(totalValue / 10000000).toFixed(2)} Cr</p>
        </div>
        <InsightList title="Fast-moving" items={fastMoving} icon={Car} />
        <InsightList title="Unsold (available)" items={unsold} icon={Car} />
        <InsightList title="Recently added" items={recentlyAdded} icon={Car} />
      </div>

      {lowStock.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium text-foreground">Low stock alert</p>
            <p className="text-sm text-muted-foreground">
              {lowStock.map((v) => `${v.brand} ${v.model}`).join(', ')}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card-elevated p-6">
          <h3 className="mb-4 font-semibold">Brand-wise Inventory</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={brandInventory}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="brand" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(230, 80%, 55%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card-elevated p-6">
          <h3 className="mb-4 font-semibold">Category Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={categoryDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {categoryDistribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function InsightList({
  title,
  items,
  icon: Icon,
}: {
  title: string;
  items: VehicleWithRelations[];
  icon: typeof Car;
}) {
  return (
    <div className="card-elevated p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>
      <ul className="space-y-2">
        {items.length === 0 ? (
          <li className="text-xs text-muted-foreground">No data</li>
        ) : (
          items.slice(0, 4).map((v) => (
            <li key={v.id} className="flex justify-between text-xs">
              <span className="truncate font-medium">
                {v.brand} {v.model}
              </span>
              <span className="text-muted-foreground">₹{(v.price / 100000).toFixed(1)}L</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
