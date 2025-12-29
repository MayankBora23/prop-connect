import { useState } from 'react';
import { useOnlineCustomers } from '@/hooks/useOnlineCustomers';
import { CustomerCard } from './CustomerCard';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useUpdateOnlineCustomer } from '@/hooks/useOnlineCustomers';
import type { OnlineCustomer } from '@/hooks/useOnlineCustomers';

type CustomerGroup = 'regular' | 'premium' | 'vip';


const stages: { id: CustomerGroup; label: string; color: string; description: string }[] = [
  {
    id: 'regular',
    label: 'Regular',
    color: 'bg-gray-500',
    description: 'Standard customers'
  },
  {
    id: 'premium',
    label: 'Premium',
    color: 'bg-blue-500',
    description: 'High-value customers'
  },
  {
    id: 'vip',
    label: 'VIP',
    color: 'bg-purple-500',
    description: 'Most valuable customers'
  },
];

export function CustomerPipeline() {
  const { data: customers, isLoading } = useOnlineCustomers();
  const updateCustomer = useUpdateOnlineCustomer();
  const [draggedCustomer, setDraggedCustomer] = useState<any>(null);

  const getCustomersByGroup = (group: CustomerGroup) => {
    return (customers || []).filter((customer) => ((customer as any).customer_group || 'regular') === group);
  };

  const handleDragStart = (customer: OnlineCustomer) => {
    setDraggedCustomer(customer);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
  };

  const handleDrop = (e: React.DragEvent, newGroup: CustomerGroup) => {
    e.preventDefault();
    if (draggedCustomer && ((draggedCustomer as any).customer_group || 'regular') !== newGroup) {
      updateCustomer.mutate({ id: (draggedCustomer as any).id, customer_group: newGroup });
    }
    setDraggedCustomer(null);
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
          const stageCustomers = getCustomersByGroup(stage.id);
          return (
            <div key={stage.id} className="w-72 flex-shrink-0">
              <div className="flex items-center gap-2 mb-4 px-1">
                <div className={cn('w-3 h-3 rounded-full', stage.color)} />
                <h3 className="font-semibold text-foreground text-sm">{stage.label}</h3>
                <span className="ml-auto bg-secondary text-secondary-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                  {stageCustomers.length}
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
                {stageCustomers.map((customer) => (
                  <CustomerCard
                    key={customer.id}
                    customer={customer}
                    onDragStart={() => handleDragStart(customer)}
                    isDragging={draggedCustomer?.id === customer.id}
                  />
                ))}
                {stageCustomers.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    <div className="text-xs opacity-75 mb-1">No customers</div>
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
