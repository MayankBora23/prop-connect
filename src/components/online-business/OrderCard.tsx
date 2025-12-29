import React from 'react';
import { Package, User, Calendar, DollarSign, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SalesOrder } from '@/hooks/useSalesOrders';

interface OrderCardProps {
  order: SalesOrder;
  onClick?: () => void;
  onDragStart?: () => void;
  isDragging?: boolean;
}

function getStatusColor(status: string) {
  switch (status) {
    case 'delivered': return 'text-green-600 bg-green-50 border-green-200';
    case 'shipped': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'processing': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'confirmed': return 'text-purple-600 bg-purple-50 border-purple-200';
    case 'pending': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'cancelled': return 'text-red-600 bg-red-50 border-red-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

function getPaymentStatusColor(status: string) {
  switch (status) {
    case 'completed': return 'text-green-600 bg-green-50';
    case 'pending': return 'text-yellow-600 bg-yellow-50';
    case 'failed': return 'text-red-600 bg-red-50';
    case 'refunded': return 'text-blue-600 bg-blue-50';
    default: return 'text-gray-600 bg-gray-50';
  }
}

export function OrderCard({ order, onClick, onDragStart, isDragging = false }: OrderCardProps) {
  const customer = (order as any).online_customers;
  const orderDate = new Date((order as any).order_date).toLocaleDateString();
  const itemCount = (order as any).order_items?.length || 0;

  return (
    <div
      onClick={onClick}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      className={cn(
        "card-elevated p-4 cursor-pointer hover:shadow-lg transition-all duration-200 animate-scale-in border-l-4",
        isDragging && "opacity-50 rotate-2 scale-105",
        (order as any).status === 'delivered' && "border-l-green-500",
        (order as any).status === 'shipped' && "border-l-blue-500",
        (order as any).status === 'processing' && "border-l-yellow-500",
        (order as any).status === 'confirmed' && "border-l-purple-500",
        (order as any).status === 'pending' && "border-l-orange-500",
        (order as any).status === 'cancelled' && "border-l-red-500"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
            {customer?.name.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-sm">
              {(order as any).order_number || `ORD-${order.id.slice(-6)}`}
            </h4>
            <p className="text-xs text-muted-foreground">{customer?.name || 'Guest Customer'}</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className={cn(
          "px-2 py-1 rounded-full text-xs font-semibold border",
          getStatusColor((order as any).status)
        )}>
          {(order as any).status.charAt(0).toUpperCase() + (order as any).status.slice(1)}
        </div>
      </div>

      <div className="space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5" />
          <span>{customer?.phone || 'No phone'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" />
          <span>{orderDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <Package className="w-3.5 h-3.5" />
          <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            ₹{(order as any).total_amount.toLocaleString()}
          </span>
          </div>
          <div className={cn(
            "px-2 py-1 rounded-full text-xs font-semibold",
            getPaymentStatusColor(order.payment_status || 'pending')
          )}>
            <CreditCard className="w-3 h-3 inline mr-1" />
            {(order as any).payment_status || 'pending'}
          </div>
        </div>
      </div>

      {(order as any).notes && (
        <div className="mt-2 text-xs text-muted-foreground">
          <p className="truncate">{(order as any).notes}</p>
        </div>
      )}
    </div>
  );
}
