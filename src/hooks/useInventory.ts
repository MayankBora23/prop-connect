import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Temporary types until migration is applied
type InventoryRow = {
  id: string;
  sku: string;
  opening_stock: number;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  reorder_point: number;
  minimum_stock: number;
  maximum_stock: number | null;
  location: string | null;
  supplier_id: string | null;
  last_restocked: string | null;
  auto_reorder: boolean;
  last_updated: string;
  company_id: string;
  products?: {
    id: string;
    name: string | null;
    variant_group_id: string | null;
    product_type: string | null;
  } | null;
};

type InventoryLedgerRow = {
  id: string;
  sku: string;
  action: 'stock_in' | 'stock_out' | 'return_to_stock' | 'adjustment';
  quantity: number;
  reference_id: string | null;
  reference_type: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  company_id: string;
};

export type Inventory = InventoryRow;
export type InventoryInsert = {
  sku: string;
  opening_stock?: number;
  current_stock?: number;
  reserved_stock?: number;
  reorder_point?: number;
  minimum_stock?: number;
  maximum_stock?: number;
  location?: string;
  supplier_id?: string;
  last_restocked?: string;
  auto_reorder?: boolean;
};
export type InventoryUpdate = Partial<InventoryInsert> & { id: string };

export type InventoryLedger = InventoryLedgerRow;
export type InventoryLedgerInsert = {
  sku: string;
  action: 'stock_in' | 'stock_out' | 'return_to_stock' | 'adjustment';
  quantity: number;
  reference_id?: string;
  reference_type?: 'order' | 'return' | 'purchase' | 'adjustment';
  notes?: string;
};
export type InventoryLedgerUpdate = Partial<InventoryLedgerInsert> & { id: string };

export function useInventory() {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['inventory', company?.id],
    queryFn: async (): Promise<Inventory[]> => {
      if (!company?.id) return [];

      try {
        // First, try to get all products with SKUs
        const { data: productsWithSku, error: productsError } = await supabase
          .from('products')
          .select('id, name, sku, variant_group_id, product_type')
          .not('sku', 'is', null)
          .eq('company_id', company.id);

        if (productsError) {
          console.warn('Error fetching products:', productsError.message);
          return [];
        }

        if (!productsWithSku || productsWithSku.length === 0) {
          return [];
        }

        // Then, try to get inventory data for these SKUs
        const skus = (productsWithSku as any[]).map((p: any) => p.sku).filter(Boolean);
        const { data: inventoryData, error: inventoryError } = await supabase
          .from('sku_inventory' as any)
          .select('*')
          .eq('company_id', company.id)
          .in('sku', skus);

        // Create inventory entries for all products, even if they don't have inventory data yet
        const inventoryMap = new Map(
          (inventoryData || []).map((inv: any) => [inv.sku, inv])
        );

        const fullInventory: Inventory[] = (productsWithSku as any[]).map((product: any) => {
          const existingInventory = inventoryMap.get(product.sku);
          if (existingInventory) {
            return {
              ...existingInventory,
              products: {
                id: product.id,
                name: product.name,
                variant_group_id: product.variant_group_id,
                product_type: product.product_type,
              },
            } as Inventory;
          } else {
            // Create a default inventory entry for products without inventory data
            return {
              id: `temp-${product.id}`,
              sku: product.sku,
              opening_stock: 0,
              current_stock: 0,
              reserved_stock: 0,
              available_stock: 0,
              reorder_point: 10,
              minimum_stock: 5,
              maximum_stock: null,
              location: null,
              supplier_id: null,
              last_restocked: null,
              auto_reorder: false,
              last_updated: new Date().toISOString(),
              company_id: company.id,
              products: {
                id: product.id,
                name: product.name,
                variant_group_id: product.variant_group_id,
                product_type: product.product_type,
              },
            } as Inventory;
          }
        });

        return fullInventory;
      } catch (err) {
        console.warn('Inventory query failed:', err);
        return [];
      }
    },
    enabled: !!company?.id,
  });
}

export function useInventoryBySku(sku: string) {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['inventory_sku', sku, company?.id],
    queryFn: async () => {
      if (!company?.id || !sku) return null;

      try {
        const { data, error } = await supabase
          .from('sku_inventory' as any)
          .select('*')
          .eq('sku', sku)
          .eq('company_id', company.id)
          .maybeSingle();

        if (error) {
          console.warn('sku_inventory table not found:', error.message);
          return null;
        }
        return data as unknown as Inventory | null;
      } catch (err) {
        console.warn('Inventory table not available yet:', err);
        return null;
      }
    },
    enabled: !!company?.id && !!sku,
  });
}

export function useInventoryLedger(sku?: string, limit = 50) {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['inventory_ledger', sku, company?.id, limit],
    queryFn: async () => {
      if (!company?.id) return [];

      try {
        let query = supabase
          .from('inventory_ledger' as any)
          .select('*')
          .eq('company_id', company.id)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (sku) {
          query = query.eq('sku', sku);
        }

        const { data, error } = await query;

        if (error) {
          console.warn('inventory_ledger table not found:', error.message);
          return [];
        }
        return data as unknown as InventoryLedger[];
      } catch (err) {
        console.warn('Inventory ledger table not available yet:', err);
        return [];
      }
    },
    enabled: !!company?.id,
  });
}

export function useCreateInventoryEntry() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (inventory: InventoryInsert) => {
      if (!company?.id) throw new Error('No company found');

      try {
        const { data, error } = await supabase
          .from('sku_inventory' as any)
          .insert({
            ...inventory,
            company_id: company.id,
          })
          .select()
          .single();

        if (error) {
          console.warn('sku_inventory table not found, cannot create inventory entry:', error.message);
          // Return a mock inventory object for now
          return {
            id: 'temp-' + Date.now(),
            sku: inventory.sku,
            opening_stock: inventory.opening_stock || 0,
            current_stock: inventory.current_stock || 0,
            reserved_stock: inventory.reserved_stock || 0,
            available_stock: (inventory.current_stock || 0) - (inventory.reserved_stock || 0),
            last_updated: new Date().toISOString(),
            company_id: company.id,
          } as Inventory;
        }
        return data as unknown as Inventory;
      } catch (err) {
        console.warn('Cannot create inventory entry until migration is applied:', err);
        throw new Error('Inventory system not available yet. Please run the database migration first.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useUpdateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: InventoryUpdate & { id: string }) => {
      try {
        const { data, error } = await supabase
          .from('sku_inventory' as any)
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.warn('sku_inventory table not found, cannot update inventory:', error.message);
          throw new Error('Inventory system not available yet. Please run the database migration first.');
        }
        return data as unknown as Inventory;
      } catch (err) {
        console.warn('Cannot update inventory until migration is applied:', err);
        throw new Error('Inventory system not available yet. Please run the database migration first.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useCreateInventoryLedgerEntry() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (ledger: InventoryLedgerInsert) => {
      if (!company?.id) throw new Error('No company found');

      try {
        const { data, error } = await supabase
          .from('inventory_ledger' as any)
          .insert({
            ...ledger,
            company_id: company.id,
          })
          .select()
          .single();

        if (error) {
          console.warn('inventory_ledger table not found, cannot create ledger entry:', error.message);
          // Return a mock ledger entry for now
          return {
            id: 'temp-ledger-' + Date.now(),
            sku: ledger.sku,
            action: ledger.action,
            quantity: ledger.quantity,
            reference_id: ledger.reference_id,
            reference_type: ledger.reference_type,
            notes: ledger.notes,
            created_by: null,
            created_at: new Date().toISOString(),
            company_id: company.id,
          } as InventoryLedger;
        }
        return data as unknown as InventoryLedger;
      } catch (err) {
        console.warn('Cannot create inventory ledger entry until migration is applied:', err);
        // Return a mock entry to prevent errors
        return {
          id: 'temp-ledger-' + Date.now(),
          sku: ledger.sku,
          action: ledger.action,
          quantity: ledger.quantity,
          reference_id: ledger.reference_id,
          reference_type: ledger.reference_type,
          notes: ledger.notes,
          created_by: null,
          created_at: new Date().toISOString(),
          company_id: company.id,
        } as InventoryLedger;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_ledger'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

// Helper function to update inventory stock levels
export function useUpdateInventoryStock() {
  const queryClient = useQueryClient();
  const updateInventory = useUpdateInventory();
  const createLedgerEntry = useCreateInventoryLedgerEntry();

  return useMutation({
    mutationFn: async ({
      sku,
      quantityChange,
      action,
      referenceId,
      referenceType,
      notes
    }: {
      sku: string;
      quantityChange: number; // positive for stock in, negative for stock out
      action: 'stock_in' | 'stock_out' | 'return_to_stock' | 'adjustment';
      referenceId?: string;
      referenceType?: 'order' | 'return' | 'purchase' | 'adjustment';
      notes?: string;
    }) => {
      try {
        // Try RPC function first (if migration is applied)
        const { data: rpcResult, error: rpcError } = await (supabase as any).rpc('update_inventory_stock', {
          p_sku: sku,
          p_quantity_change: quantityChange,
          p_company_id: '', // Will be set by RLS
        });

        if (!rpcError) {
          // RPC succeeded, create ledger entry
          await createLedgerEntry.mutateAsync({
            sku,
            action,
            quantity: Math.abs(quantityChange),
            reference_id: referenceId,
            reference_type: referenceType,
            notes,
          });
          return { success: true };
        }

        // Fallback: manual inventory update
        console.warn('RPC function not available, using manual update');

        // First, get current inventory
        const { data: currentInventory, error: fetchError } = await supabase
          .from('sku_inventory' as any)
          .select('*')
          .eq('sku', sku)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.warn('Cannot fetch inventory:', fetchError.message);
          return { success: false, error: 'Inventory system not available yet' };
        }

        if (!currentInventory) {
          console.warn(`Inventory entry not found for SKU: ${sku}`);
          return { success: false, error: `Inventory entry not found for SKU: ${sku}` };
        }

        const inventoryData = currentInventory as any;
        const newCurrentStock = inventoryData.current_stock + quantityChange;

        // Validate stock levels
        if (newCurrentStock < 0) {
          throw new Error(`Insufficient stock for SKU ${sku}. Current: ${inventoryData.current_stock}, Requested: ${Math.abs(quantityChange)}`);
        }

        // Update inventory
        await updateInventory.mutateAsync({
          id: inventoryData.id,
          current_stock: newCurrentStock,
        });

        // Create ledger entry
        await createLedgerEntry.mutateAsync({
          sku,
          action,
          quantity: Math.abs(quantityChange),
          reference_id: referenceId,
          reference_type: referenceType,
          notes,
        });

        return { currentInventory, newCurrentStock, success: true };
      } catch (err) {
        console.warn('Stock update failed:', err);
        return { success: false, error: 'Inventory system not available yet. Please run the database migration first.' };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_ledger'] });
    },
  });
}

// Helper function to reserve stock (for orders)
export function useReserveStock() {
  const queryClient = useQueryClient();
  const updateInventory = useUpdateInventory();

  return useMutation({
    mutationFn: async ({ sku, quantity }: { sku: string; quantity: number }) => {
      try {
        const { data: currentInventory, error } = await supabase
          .from('sku_inventory' as any)
          .select('*')
          .eq('sku', sku)
          .single();

        if (error) {
          console.warn('Cannot reserve stock:', error.message);
          return null;
        }
        if (!currentInventory) {
          console.warn(`Inventory not found for SKU: ${sku}`);
          return null;
        }

        const inventoryData = currentInventory as any;
        const availableStock = inventoryData.current_stock - inventoryData.reserved_stock;
        if (availableStock < quantity) {
          throw new Error(`Insufficient available stock for SKU ${sku}. Available: ${availableStock}, Requested: ${quantity}`);
        }

        await updateInventory.mutateAsync({
          id: inventoryData.id,
          reserved_stock: inventoryData.reserved_stock + quantity,
        });

        return currentInventory;
      } catch (err) {
        console.warn('Stock reservation failed:', err);
        return null;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

// Helper function to release reserved stock
export function useReleaseReservedStock() {
  const queryClient = useQueryClient();
  const updateInventory = useUpdateInventory();

  return useMutation({
    mutationFn: async ({ sku, quantity }: { sku: string; quantity: number }) => {
      try {
        const { data: currentInventory, error } = await supabase
          .from('sku_inventory' as any)
          .select('*')
          .eq('sku', sku)
          .single();

        if (error) {
          console.warn('Cannot release reserved stock:', error.message);
          return null;
        }
        if (!currentInventory) {
          console.warn(`Inventory not found for SKU: ${sku}`);
          return null;
        }

        const inventoryData = currentInventory as any;
        const newReservedStock = Math.max(0, inventoryData.reserved_stock - quantity);

        await updateInventory.mutateAsync({
          id: inventoryData.id,
          reserved_stock: newReservedStock,
        });

        return currentInventory;
      } catch (err) {
        console.warn('Stock release failed:', err);
        return null;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}
