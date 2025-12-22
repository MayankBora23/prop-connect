import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type SalesOrder = Tables<'sales_orders'>;
export type SalesOrderInsert = TablesInsert<'sales_orders'>;
export type SalesOrderUpdate = TablesUpdate<'sales_orders'>;

export function useSalesOrders() {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['sales_orders', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          *,
          online_customers (
            id,
            name,
            phone,
            email
          ),
          payments (
            id,
            amount,
            payment_status
          ),
          order_items (
            id,
            quantity,
            unit_price,
            total_price,
            products (
              id,
              name,
              sku
            )
          )
        `)
        .eq('company_id', company.id)
        .order('order_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });
}

export function useSalesOrder(id: string) {
  return useQuery({
    queryKey: ['sales_order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          *,
          online_customers (
            id,
            name,
            phone,
            email,
            address,
            city,
            state
          ),
          order_items (
            id,
            quantity,
            unit_price,
            discount_amount,
            total_price,
            products (
              id,
              name,
              sku,
              images
            ),
            product_variants (
              id,
              variant_name,
              variant_value
            )
          ),
          payments (
            id,
            amount,
            payment_method,
            payment_status,
            transaction_id
          ),
          discounts (
            id,
            name,
            discount_type,
            discount_value
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSalesOrder() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (order: SalesOrderInsert) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('sales_orders')
        .insert({
          ...order,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as SalesOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
    },
  });
}

export function useUpdateSalesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: SalesOrderUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('sales_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SalesOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
    },
  });
}

export function useDeleteSalesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sales_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
    },
  });
}
