import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Product = Tables<'products'> & {
  // Add variant-related fields that might not be in the auto-generated types
  product_type?: string;
  variant_group_id?: string;
};

export type ProductInsert = {
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  category?: string;
  unit_type?: string;
  selling_price: number;
  purchase_price?: number;
  tax_percentage?: number;
  product_type?: 'simple' | 'variant';
  variant_group_id?: string;
};

export type ProductUpdate = Omit<TablesUpdate<'products'>, 'stock_quantity'> & {
  product_type?: 'simple' | 'variant';
  variant_group_id?: string;
};

export function useProducts() {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['products', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Product[];
    },
    enabled: !!company?.id,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as Product | null;
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (product: ProductInsert) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('products')
        .insert({
          ...product,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ProductUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// Variant-specific functions
export function useProductVariants(parentProductId: string) {
  return useQuery({
    queryKey: ['product_variants', parentProductId],
    queryFn: async (): Promise<Product[]> => {
      try {
        const { data: parentData, error: parentError } = await (supabase as any)
          .from('products')
          .select('variant_group_id')
          .eq('id', parentProductId)
          .single();

        if (parentError) {
          console.warn('Cannot fetch parent product variant_group_id:', parentError.message);
          return [];
        }

        const parentInfo = parentData as any;
        const { data, error } = await (supabase as any)
          .from('products')
          .select('*')
          .eq('variant_group_id', parentInfo.variant_group_id)
          .neq('id', parentProductId)
          .order('sku');

        if (error) {
          console.warn('Cannot fetch product variants:', error.message);
          return [];
        }
        return data as unknown as Product[];
      } catch (err) {
        console.warn('Product variants not available yet:', err);
        return [];
      }
    },
    enabled: !!parentProductId,
  });
}

export function useVariantGroup(variantGroupId: string) {
  return useQuery({
    queryKey: ['variant_group', variantGroupId],
    queryFn: async (): Promise<Product[]> => {
      try {
        const { data, error } = await (supabase as any)
          .from('products')
          .select('*')
          .eq('variant_group_id', variantGroupId)
          .order('product_type', { ascending: false }); // Parent first, then variants

        if (error) {
          console.warn('Cannot fetch variant group:', error.message);
          return [];
        }
        return data as unknown as Product[];
      } catch (err) {
        console.warn('Variant group not available yet:', err);
        return [];
      }
    },
    enabled: !!variantGroupId,
  });
}

export function useCreateProductVariant() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async ({
      parentProductId,
      variantName,
      variantValue,
      sku,
      barcode,
      additionalPrice = 0,
      stockQuantity = 0
    }: {
      parentProductId: string;
      variantName: string;
      variantValue: string;
      sku: string;
      barcode: string;
      additionalPrice?: number;
      stockQuantity?: number;
    }) => {
      if (!company?.id) throw new Error('No company found');

      // Get parent product info
      const { data: parentProduct, error: parentError } = await (supabase as any)
        .from('products')
        .select('variant_group_id, selling_price, category, unit_type')
        .eq('id', parentProductId)
        .single();

      if (parentError) throw parentError;
      const parentData = parentProduct as any;
      if (!parentData?.variant_group_id) {
        console.warn('Parent product missing variant_group_id, variant functionality not available yet');
        throw new Error('Variant functionality not available. Please run the database migration first.');
      }

      const { data, error } = await (supabase as any)
        .from('products')
        .insert({
          name: `${parentData.sku || 'Variant'} - ${variantValue}`,
          sku: sku,
          barcode: barcode,
          category: parentData.category,
          unit_type: parentData.unit_type,
          selling_price: parentData.selling_price + additionalPrice,
          product_type: 'simple', // Variants are simple products with stock
          variant_group_id: parentData.variant_group_id,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product_variants'] });
      queryClient.invalidateQueries({ queryKey: ['variant_group'] });
    },
  });
}

export function useCreateVariantGroup() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (variants: Array<{
      name: string;
      variantValue: string;
      sku: string;
      barcode: string;
      additionalPrice?: number;
    }>) => {
      if (!company?.id) throw new Error('No company found');

      // Generate variant group ID (fallback until RPC is available)
      let groupId: string;
      try {
        const { data: rpcGroupId, error: groupError } = await (supabase as any).rpc('generate_variant_group_id');
        if (groupError) throw groupError;
        groupId = rpcGroupId;
      } catch (rpcErr) {
        console.warn('RPC function not available, generating group ID manually');
        // Fallback: generate a simple group ID
        groupId = 'GRP' + Math.random().toString(36).substring(2, 5).toUpperCase();
      }

      const products = variants.map(variant => ({
        name: variant.name,
        sku: variant.sku,
        barcode: variant.barcode,
        category: 'Variant',
        unit_type: 'piece',
        selling_price: 0, // Will be set by individual variants
        product_type: 'simple',
        variant_group_id: groupId,
        company_id: company.id,
      }));

      const { data, error } = await supabase
        .from('products')
        .insert(products)
        .select();

      if (error) throw error;
      return data as Product[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
