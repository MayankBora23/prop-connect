import { useProducts } from '@/hooks/useProducts';
import { useOnlineCustomers } from '@/hooks/useOnlineCustomers';
import { useSalesOrders } from '@/hooks/useSalesOrders';
import { usePayments } from '@/hooks/usePayments';
import { StatCard } from '@/components/dashboard/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Users, ClipboardList, Receipt, TrendingUp, DollarSign } from 'lucide-react';

export function OnlineBusinessDashboard() {
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: customers, isLoading: customersLoading } = useOnlineCustomers();
  const { data: orders, isLoading: ordersLoading } = useSalesOrders();
  const { data: payments, isLoading: paymentsLoading } = usePayments();

  const isLoading = productsLoading || customersLoading || ordersLoading || paymentsLoading;

  const totalProducts = products?.length || 0;
  const activeProducts = products?.filter(p => p.status === 'active').length || 0;
  const totalCustomers = customers?.length || 0;
  const totalOrders = orders?.length || 0;
  const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
  const totalPayments = payments?.length || 0;
  const completedPayments = payments?.filter(p => p.payment_status === 'completed').length || 0;
  const totalRevenue = payments?.filter(p => p.payment_status === 'completed').reduce((sum, payment) => sum + payment.amount, 0) || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Message */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome to Online Business CRM</h1>
        <p className="text-muted-foreground">Manage your e-commerce operations, inventory, and customer relationships efficiently.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))
        ) : (
          <>
            <StatCard
              title="Total Products"
              value={totalProducts}
              icon={Package}
              iconBg="bg-blue-500"
            />
            <StatCard
              title="Active Products"
              value={activeProducts}
              icon={Package}
              iconBg="bg-green-500"
            />
            <StatCard
              title="Total Customers"
              value={totalCustomers}
              icon={Users}
              iconBg="bg-orange-500"
            />
            <StatCard
              title="Total Orders"
              value={totalOrders}
              icon={ClipboardList}
              iconBg="bg-purple-500"
            />
            <StatCard
              title="Pending Orders"
              value={pendingOrders}
              icon={ClipboardList}
              iconBg="bg-yellow-500"
            />
            <StatCard
              title="Completed Payments"
              value={completedPayments}
              icon={Receipt}
              iconBg="bg-red-500"
            />
          </>
        )}
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-green-100">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Total Revenue</h3>
              <p className="text-sm text-muted-foreground">From completed payments</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-green-600">
            ₹{totalRevenue.toLocaleString()}
          </div>
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-100">
              <ClipboardList className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Order Pipeline</h3>
              <p className="text-sm text-muted-foreground">Orders requiring attention</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-600">
            {pendingOrders}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card-elevated p-6">
        <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex flex-col items-center gap-2 p-4 rounded-lg border border-dashed border-border hover:bg-secondary/50 transition-colors">
            <Package className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm font-medium">Add Product</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 rounded-lg border border-dashed border-border hover:bg-secondary/50 transition-colors">
            <Users className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm font-medium">Add Customer</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 rounded-lg border border-dashed border-border hover:bg-secondary/50 transition-colors">
            <ClipboardList className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm font-medium">Create Order</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 rounded-lg border border-dashed border-border hover:bg-secondary/50 transition-colors">
            <Receipt className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm font-medium">Process Payment</span>
          </button>
        </div>
      </div>
    </div>
  );
}
