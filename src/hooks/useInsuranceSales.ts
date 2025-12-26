import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';

// Cast supabase to any to bypass type checking for automobile tables
const supabaseAny = supabase as any;

export type InsuranceSale = Tables<'insurance_sales'>;
export type InsuranceSaleInsert = TablesInsert<'insurance_sales'>;
export type InsuranceSaleUpdate = TablesUpdate<'insurance_sales'>;

export function useInsuranceSales() {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['insurance_sales', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabaseAny
        .from('insurance_sales')
        .select(`
          *,
          auto_leads (
            id,
            name,
            phone,
            email
          ),
          deals (
            id,
            deal_number,
            final_price
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

export function useInsuranceSale(id: string) {
  return useQuery({
    queryKey: ['insurance_sale', id],
    queryFn: async () => {
      const { data, error } = await supabaseAny
        .from('insurance_sales')
        .select(`
          *,
          auto_leads (
            id,
            name,
            phone,
            email
          ),
          deals (
            id,
            deal_number,
            final_price,
            delivery_date
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateInsuranceSale() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (sale: InsuranceSaleInsert) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabaseAny
        .from('insurance_sales')
        .insert({
          ...sale,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as InsuranceSale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance_sales'] });
    },
  });
}

export function useUpdateInsuranceSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: InsuranceSaleUpdate & { id: string }) => {
      const { data, error } = await supabaseAny
        .from('insurance_sales')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as InsuranceSale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance_sales'] });
    },
  });
}

export function useDeleteInsuranceSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('insurance_sales')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance_sales'] });
    },
  });
}
