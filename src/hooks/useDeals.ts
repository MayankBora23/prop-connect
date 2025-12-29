import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';

// Cast supabase to any to bypass type checking for automobile tables
const supabaseAny = supabase as any;

export type Deal = Tables<'deals'>;
export type DealInsert = TablesInsert<'deals'>;
export type DealUpdate = TablesUpdate<'deals'>;

export function useDeals() {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['deals', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabaseAny
        .from('deals')
        .select(`
          *,
          auto_leads (
            id,
            name,
            phone,
            email
          ),
          vehicles (
            id,
            brand,
            model,
            year,
            fuel_type
          ),
          bookings (
            id,
            booking_number,
            total_amount
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

export function useDeal(id: string) {
  return useQuery({
    queryKey: ['deal', id],
    queryFn: async () => {
      const { data, error } = await supabaseAny
        .from('deals')
        .select(`
          *,
          auto_leads (
            id,
            name,
            phone,
            email,
            preferred_brand,
            preferred_model
          ),
          vehicles (
            id,
            brand,
            model,
            year,
            fuel_type,
            transmission,
            price
          ),
          bookings (
            id,
            booking_number,
            total_amount,
            vehicle_price,
            discount_amount
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (deal: DealInsert) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabaseAny
        .from('deals')
        .insert({
          ...deal,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Deal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: DealUpdate & { id: string }) => {
      const { data, error } = await supabaseAny
        .from('deals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Deal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}
