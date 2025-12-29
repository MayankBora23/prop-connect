import { useState } from 'react';
import { useSalesOrders } from '@/hooks/useSalesOrders';
import { OrderCard } from './OrderCard';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useUpdateSalesOrder } from '@/hooks/useSalesOrders';
import type { SalesOrder } from '@/hooks/useSalesOrders';

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';


const stages: { id: OrderStatus; label: string; color: string; description: string }[] = [
  {
    id: 'pending',
    label: 'Pending',
    color: 'bg-orange-500',
    description: 'Orders awaiting confirmation'
  },
  {
    id: 'confirmed',
    label: 'Confirmed',
    color: 'bg-purple-500',
    description: 'Orders confirmed and ready to process'
  },
  {
    id: 'processing',
    label: 'Processing',
    color: 'bg-yellow-500',
    description: 'Orders being prepared for shipment'
  },
  {
    id: 'shipped',
    label: 'Shipped',
    color: 'bg-blue-500',
    description: 'Orders shipped to customers'
  },
  {
    id: 'delivered',
    label: 'Delivered',
    color: 'bg-green-500',
    description: 'Orders successfully delivered'
  },
  {
    id: 'cancelled',
    label: 'Cancelled',
    color: 'bg-red-500',
    description: 'Orders that were cancelled'
  },
];

export function OrderPipeline() {
  const { data: orders, isLoading } = useSalesOrders();
  const updateOrder = useUpdateSalesOrder();
  const [draggedOrder, setDraggedOrder] = useState<SalesOrder | null>(null);

  const getOrdersByStatus = (status: OrderStatus) => {
    return (orders || []).filter((order) => (order as any).status === status);
  };

  const handleDragStart = (order: SalesOrder) => {
    setDraggedOrder(order);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
  };

  const handleDrop = (e: React.DragEvent, newStatus: OrderStatus) => {
    e.preventDefault();
    if (draggedOrder && (draggedOrder as any).status !== newStatus) {
      updateOrder.mutate({ id: (draggedOrder as any).id, status: newStatus });
    }
    setDraggedOrder(null);
  };

  if (isLoading) {
    return (
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {stages.map((stage) => (
            <div key={stage.id} className="w-72 flex-shrink-0">
              <div className="flex items-center gap-2 mb-4 px-1">
                <div className={cn('w-3 h-3 rounded-full', stage.color)} />
                <h3 className="font-semibold text-foreground text-sm">{stage.label}</h3>
              </div>
              <div className="space-y-3 min-h-[200px] p-2 rounded-xl bg-secondary/50">
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {stages.map((stage) => {
          const stageOrders = getOrdersByStatus(stage.id);
          return (
            <div key={stage.id} className="w-72 flex-shrink-0">
              <div className="flex items-center gap-2 mb-4 px-1">
                <div className={cn('w-3 h-3 rounded-full', stage.color)} />
                <h3 className="font-semibold text-foreground text-sm">{stage.label}</h3>
                <span className="ml-auto bg-secondary text-secondary-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                  {stageOrders.length}
                </span>
              </div>
              <div className="mb-2 px-1">
                <p className="text-xs text-muted-foreground">{stage.description}</p>
              </div>
              <div
                className="space-y-3 min-h-[400px] p-2 rounded-xl bg-secondary/50 transition-colors hover:bg-secondary/70"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                {stageOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onDragStart={() => handleDragStart(order)}
                    isDragging={draggedOrder?.id === order.id}
                  />
                ))}
                {stageOrders.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    <div className="text-xs opacity-75 mb-1">No orders</div>
                    <div className="text-xs">{stage.description.toLowerCase()}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
