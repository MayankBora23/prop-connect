import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Return = Tables<'returns'>;
export type ReturnInsert = {
  order_id: string;
  return_number?: string;
  return_date?: string;
  status?: string;
  return_reason?: string;
  refund_amount?: number;
  refund_status?: string;
  return_items?: any[];
  notes?: string;
};
export type ReturnUpdate = TablesUpdate<'returns'>;

export function useReturns() {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['returns', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('returns')
        .select(`
          *,
          sales_orders (
            id,
            order_number,
            total_amount,
            online_customers (
              id,
              name
            )
          )
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });
}

export function useReturn(id: string) {
  return useQuery({
    queryKey: ['return', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('returns')
        .select(`
          *,
          sales_orders (
            id,
            order_number,
            total_amount,
            online_customers (
              id,
              name,
              phone,
              email
            )
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateReturn() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (returnItem: ReturnInsert) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('returns')
        .insert({
          ...returnItem,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Return;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
    },
  });
}

export function useUpdateReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ReturnUpdate & { id: string }) => {
      // First, get the current return to check for status changes
      const { data: currentReturn, error: fetchError } = await supabase
        .from('returns')
        .select(`
          *,
          sales_orders (
            order_items (
              quantity,
              products (
                sku
              )
            )
          )
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const oldStatus = currentReturn.status;
      const newStatus = updates.status || oldStatus;

      // Update the return
      const { data, error } = await supabase
        .from('returns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Handle inventory updates when return is approved
      if (oldStatus !== 'approved' && newStatus === 'approved') {
        // Return approved - return items to stock
        try {
          const returnItems = currentReturn.return_items as any[] || [];

          for (const returnItem of returnItems) {
            // Find the corresponding order item to get SKU
            const orderItem = currentReturn.sales_orders?.order_items?.find(
              (item: any) => item.products?.id === returnItem.product_id
            );

            if (orderItem?.products?.sku && returnItem.quantity) {
              // Try to create inventory ledger entry for stock return
              try {
                await supabase
                  .from('inventory_ledger' as any)
                  .insert({
                    sku: orderItem.products.sku,
                    action: 'return_to_stock',
                    quantity: returnItem.quantity,
                    reference_id: id,
                    reference_type: 'return',
                    notes: `Return ${currentReturn.return_number || id} approved`,
                    company_id: currentReturn.company_id,
                  });
              } catch (ledgerErr) {
                console.warn('Cannot create inventory ledger entry:', ledgerErr);
              }

              // Try to update inventory stock levels
              try {
                await supabase.rpc('update_inventory_stock', {
                  p_sku: orderItem.products.sku,
                  p_quantity_change: returnItem.quantity,
                  p_company_id: currentReturn.company_id,
                });
              } catch (rpcErr) {
                console.warn('Cannot update inventory stock via RPC:', rpcErr);
              }
            }
          }
        } catch (inventoryErr) {
          console.warn('Inventory update failed for return approval:', inventoryErr);
          // Don't fail the return update if inventory operations fail
        }
      }

      return data as Return;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_ledger'] });
    },
  });
}

export function useDeleteReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('returns')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
    },
  });
}
