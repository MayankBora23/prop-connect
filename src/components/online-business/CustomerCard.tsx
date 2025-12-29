import React from 'react';
import { Phone, Mail, MapPin, Calendar, ShoppingBag, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OnlineCustomer } from '@/hooks/useOnlineCustomers';

interface CustomerCardProps {
  customer: OnlineCustomer;
  onClick?: () => void;
  onDragStart?: () => void;
  isDragging?: boolean;
}

function getGroupColor(group: string) {
  switch (group) {
    case 'vip': return 'text-purple-600 bg-purple-50 border-purple-200';
    case 'premium': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'regular': return 'text-gray-600 bg-gray-50 border-gray-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

export function CustomerCard({ customer, onClick, onDragStart, isDragging = false }: CustomerCardProps) {
  const lastOrderDate = (customer as any).last_order_date ? new Date((customer as any).last_order_date).toLocaleDateString() : null;

  return (
    <div
      onClick={onClick}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
        className={cn(
        "card-elevated p-4 cursor-pointer hover:shadow-lg transition-all duration-200 animate-scale-in border-l-4",
        isDragging && "opacity-50 rotate-2 scale-105",
        (customer as any).customer_group === 'vip' && "border-l-purple-500",
        (customer as any).customer_group === 'premium' && "border-l-blue-500",
        (customer as any).customer_group === 'regular' && "border-l-gray-500"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
            {customer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-sm">{customer.name}</h4>
            <p className="text-xs text-muted-foreground">
              {(customer as any).customer_group && `${(customer as any).customer_group.charAt(0).toUpperCase() + (customer as any).customer_group.slice(1)} • `}
              {customer.gender && `${customer.gender}`}
            </p>
          </div>
        </div>

        {/* Group Badge */}
        <div className={cn(
          "px-2 py-1 rounded-full text-xs font-semibold border",
          getGroupColor((customer as any).customer_group || 'regular')
        )}>
          {(customer as any).customer_group || 'regular'}
        </div>
      </div>

      <div className="space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Phone className="w-3.5 h-3.5" />
          <span>{customer.phone}</span>
        </div>
        {customer.email && (
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5" />
            <span className="truncate">{customer.email}</span>
          </div>
        )}
        {customer.city && (
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5" />
            <span>{customer.city}{customer.state && `, ${customer.state}`}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" />
          <span>Joined {new Date(customer.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 mb-1">
              <ShoppingBag className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Orders</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{(customer as any).total_orders || 0}</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 mb-1">
              <DollarSign className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Spent</span>
            </div>
            <p className="text-sm font-semibold text-foreground">₹{((customer as any).total_spent || 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {lastOrderDate && (
        <div className="mt-2 text-xs text-muted-foreground text-center">
          Last order: {lastOrderDate}
        </div>
      )}

      {customer.tags && customer.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {customer.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full"
            >
              {tag}
            </span>
          ))}
          {customer.tags.length > 3 && (
            <span className="text-xs px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full">
              +{customer.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
