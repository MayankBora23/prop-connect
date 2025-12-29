import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Discount = Tables<'discounts'>;
export type DiscountInsert = {
  name: string;
  description?: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  minimum_purchase?: number;
  maximum_discount?: number;
  is_active?: boolean;
  valid_from?: string;
  valid_until?: string;
  usage_limit?: number;
  coupon_code?: string;
  applicable_products?: string[];
  applicable_categories?: string[];
};
export type DiscountUpdate = TablesUpdate<'discounts'>;

export function useDiscounts() {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['discounts', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Discount[];
    },
    enabled: !!company?.id,
  });
}

export function useDiscount(id: string) {
  return useQuery({
    queryKey: ['discount', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as Discount | null;
    },
  });
}

export function useCreateDiscount() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (discount: DiscountInsert) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('discounts')
        .insert({
          ...discount,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Discount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
    },
  });
}

export function useUpdateDiscount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: DiscountUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('discounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Discount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
    },
  });
}

export function useDeleteDiscount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('discounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
    },
  });
}
