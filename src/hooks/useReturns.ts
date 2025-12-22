import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Return = Tables<'returns'>;
export type ReturnInsert = TablesInsert<'returns'>;
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
      const { data, error } = await supabase
        .from('returns')
        .update(updates)
        .eq('id', id)
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
