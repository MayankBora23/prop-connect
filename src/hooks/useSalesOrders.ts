import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Temporary type definition until migration is applied
// @ts-ignore - sales_orders table will be created by migration
export type SalesOrder = {
  id: string;
  order_number?: string;
  customer_id: string;
  order_date: string;
  status?: string;
  subtotal: number;
  tax_amount?: number;
  discount_amount?: number;
  shipping_amount?: number;
  total_amount: number;
  payment_method?: string;
  payment_status?: string;
  shipping_address?: string;
  billing_address?: string;
  notes?: string;
  discount_id?: string;
  created_at: string;
  updated_at: string;
  company_id: string;
  online_customers?: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  payments?: Array<{
    id: string;
    amount: number;
    payment_status: string;
  }> | null;
  order_items?: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    discount_amount?: number;
    sku: string; // SKU of the product/variant being ordered
    product_name?: string; // Display name
    products?: {
      id: string;
      name: string | null;
      sku: string | null;
      variant_group_id?: string | null;
      product_type?: string | null;
    } | null;
  }> | null;
};

// @ts-ignore - sales_orders table will be created by migration
export type SalesOrderOld = Tables<'sales_orders'> & {
  online_customers?: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  payments?: Array<{
    id: string;
    amount: number;
    payment_status: string;
  }> | null;
  order_items?: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    products?: {
      id: string;
      name: string | null;
      sku: string | null;
    } | null;
  }> | null;
};
export type SalesOrderInsert = {
  order_number?: string;
  customer_id: string;
  order_date?: string;
  status?: string;
  subtotal: number;
  tax_amount?: number;
  discount_amount?: number;
  shipping_amount?: number;
  total_amount: number;
  payment_method?: string;
  payment_status?: string;
  shipping_address?: string;
  billing_address?: string;
  notes?: string;
  discount_id?: string;
};
// @ts-ignore - sales_orders table will be created by migration
export type SalesOrderUpdate = TablesUpdate<'sales_orders'>;

export function useSalesOrders() {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['sales_orders', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      try {
        // @ts-ignore - sales_orders table will be created by migration
        const { data, error } = await (supabase as any)
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

        if (error) {
          console.warn('sales_orders table not found:', error.message);
          return [];
        }
        return data as SalesOrder[];
      } catch (err) {
        console.warn('Sales orders table not available yet:', err);
        return [];
      }
    },
    enabled: !!company?.id,
  });
}

export function useSalesOrder(id: string) {
  return useQuery({
    queryKey: ['sales_order', id],
    queryFn: async (): Promise<SalesOrder | null> => {
      try {
        // @ts-ignore - sales_orders table will be created by migration
        const { data, error } = await (supabase as any)
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

        if (error) {
          console.warn('Cannot fetch sales order:', error.message);
          return null;
        }
        return data as SalesOrder;
      } catch (err) {
        console.warn('Sales order query failed:', err);
        return null;
      }
    },
  });
}

export function useCreateSalesOrder() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (order: SalesOrderInsert & { order_items?: any[] }): Promise<SalesOrder> => {
      if (!company?.id) throw new Error('No company found');

      try {
        const { order_items, ...orderData } = order;

        // @ts-ignore - sales_orders table will be created by migration
        const { data, error } = await (supabase as any)
          .from('sales_orders')
          .insert({
            ...orderData,
            company_id: company.id,
          })
          .select()
          .single();

        if (error) {
          console.warn('Cannot create sales order:', error.message);
          throw new Error('Sales orders functionality not available yet. Please run the database migration first.');
        }

        const createdOrder = data as SalesOrder;

        // Create order items if provided
        if (order_items && order_items.length > 0) {
          try {
            // @ts-ignore - order_items table will be created by migration
            const { error: itemsError } = await (supabase as any)
              .from('order_items')
              .insert(
                order_items.map(item => ({
                  order_id: createdOrder.id,
                  product_id: null, // We'll set this later if needed
                  sku: item.sku,
                  product_name: item.product_name,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  discount_amount: item.discount_amount || 0,
                  company_id: company.id,
                }))
              );

            if (itemsError) {
              console.warn('Cannot create order items:', itemsError.message);
              // Don't fail the order creation if items fail
            }
          } catch (itemsErr) {
            console.warn('Order items creation failed:', itemsErr);
            // Don't fail the order creation if items fail
          }
        }

        return createdOrder;
      } catch (err) {
        console.warn('Sales order creation failed:', err);
        throw new Error('Sales orders functionality not available yet. Please run the database migration first.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
    },
  });
}

export function useUpdateSalesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }): Promise<SalesOrder> => {
      // First, get the current order to check for status changes
      try {
        // @ts-ignore - sales_orders table will be created by migration
        const { data: currentOrder, error: fetchError } = await (supabase as any)
          .from('sales_orders')
          .select(`
            *,
            order_items (
              id,
              quantity,
              sku,
              product_name,
              unit_price,
              total_price,
              products (
                id,
                name,
                sku,
                product_type,
                variant_group_id
              )
            )
          `)
          .eq('id', id)
          .single();

        if (fetchError) {
          console.warn('Cannot fetch current order:', fetchError.message);
          throw new Error('Sales orders functionality not available yet. Please run the database migration first.');
        }

        const orderData = currentOrder as any;
        const oldStatus = orderData.status;
        const newStatus = updates.status || oldStatus;

        // Update the order
        // @ts-ignore - sales_orders table will be created by migration
        const { data, error } = await (supabase as any)
          .from('sales_orders')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.warn('Cannot update sales order:', error.message);
          throw new Error('Sales orders functionality not available yet. Please run the database migration first.');
        }

        // Handle inventory updates when order is confirmed
        if (oldStatus !== 'confirmed' && newStatus === 'confirmed') {
          console.log('Order confirmed - processing inventory deduction for order:', id);
          // Order confirmed - deduct stock
          try {
            for (const item of orderData.order_items || []) {
              const itemData = item as any;
              // Use sku directly from order item, fallback to products relation
              const sku = itemData.sku || itemData.products?.sku;
              console.log('Processing order item:', { itemData, sku, quantity: itemData.quantity });

              if (sku) {
                console.log('Deducting stock for SKU:', sku, 'quantity:', itemData.quantity);
                // Create inventory ledger entry for stock deduction
                try {
                  await (supabase as any)
                    .from('inventory_ledger')
                    .insert({
                      sku: sku,
                      action: 'stock_out',
                      quantity: itemData.quantity,
                      reference_id: id,
                      reference_type: 'order',
                      notes: `Sale - Order ${orderData.order_number || id} confirmed`,
                      company_id: orderData.company_id,
                    });
                } catch (ledgerErr) {
                  console.warn('Cannot create inventory ledger entry:', ledgerErr);
                }

                // Update inventory stock levels
                try {
                  await (supabase as any).rpc('update_inventory_stock', {
                    p_sku: sku,
                    p_quantity_change: -itemData.quantity, // Negative for stock out
                    p_company_id: orderData.company_id,
                  });
                } catch (rpcErr) {
                  console.warn('Cannot update inventory stock via RPC:', rpcErr);
                }
              } else {
                console.warn('Order item missing SKU:', itemData);
              }
            }
          } catch (inventoryErr) {
            console.warn('Inventory update failed for order confirmation:', inventoryErr);
            // Don't fail the order update if inventory operations fail
          }
        }
        // Handle inventory updates when order is cancelled (after being confirmed)
        else if (oldStatus === 'confirmed' && newStatus === 'cancelled') {
          console.log('Order cancelled - processing inventory return for order:', id);
          // Order cancelled - return stock
          try {
            for (const item of orderData.order_items || []) {
              const itemData = item as any;
              // Use sku directly from order item, fallback to products relation
              const sku = itemData.sku || itemData.products?.sku;
              console.log('Processing cancelled order item:', { itemData, sku, quantity: itemData.quantity });

              if (sku) {
                console.log('Returning stock for SKU:', sku, 'quantity:', itemData.quantity);
                // Create inventory ledger entry for stock return
                try {
                  await (supabase as any)
                    .from('inventory_ledger')
                    .insert({
                      sku: sku,
                      action: 'return_to_stock',
                      quantity: itemData.quantity,
                      reference_id: id,
                      reference_type: 'order',
                      notes: `Stock returned - Order ${orderData.order_number || id} cancelled`,
                      company_id: orderData.company_id,
                    });
                } catch (ledgerErr) {
                  console.warn('Cannot create inventory ledger entry:', ledgerErr);
                }

                // Update inventory stock levels
                try {
                  await (supabase as any).rpc('update_inventory_stock', {
                    p_sku: sku,
                    p_quantity_change: itemData.quantity, // Positive for stock return
                    p_company_id: orderData.company_id,
                  });
                } catch (rpcErr) {
                  console.warn('Cannot update inventory stock via RPC:', rpcErr);
                }
              } else {
                console.warn('Order item missing SKU:', itemData);
              }
            }
          } catch (inventoryErr) {
            console.warn('Inventory update failed for order cancellation:', inventoryErr);
            // Don't fail the order update if inventory operations fail
          }
        }

        return data as SalesOrder;
      } catch (err) {
        console.warn('Sales order update failed:', err);
        throw new Error('Sales orders functionality not available yet. Please run the database migration first.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_ledger'] });
    },
  });
}

export function useDeleteSalesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      try {
        // @ts-ignore - sales_orders table will be created by migration
        const { error } = await (supabase as any)
          .from('sales_orders')
          .delete()
          .eq('id', id);

        if (error) {
          console.warn('Cannot delete sales order:', error.message);
          throw new Error('Sales orders functionality not available yet. Please run the database migration first.');
        }
      } catch (err) {
        console.warn('Sales order deletion failed:', err);
        throw new Error('Sales orders functionality not available yet. Please run the database migration first.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
    },
  });
}
