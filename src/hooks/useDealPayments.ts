import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';

// Cast supabase to any to bypass type checking for automobile tables
const supabaseAny = supabase as any;

export type DealPayment = {
  id: string;
  deal_id: string;
  payment_date: string;
  payment_type: string;
  amount: number;
  payment_method?: string | null;
  reference_number?: string | null;
  remarks?: string | null;
  created_by?: string | null;
  created_at: string;
  company_id: string;
};

export function useDealPayments(dealId?: string) {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['deal-payments', dealId, company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabaseAny
        .from('deal_payments')
        .select('*')
        .eq('company_id', company.id)
        .order('payment_date', { ascending: false });

      if (dealId) {
        query = query.eq('deal_id', dealId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });
}

export function useCreateDealPayment() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (payment: Omit<DealPayment, 'id' | 'created_at' | 'company_id'>) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabaseAny
        .from('deal_payments')
        .insert({
          ...payment,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-payments'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] }); // Update deal payment status
    },
  });
}

export function useUpdateDealPaymentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dealId,
      paymentStatus
    }: {
      dealId: string;
      paymentStatus: string;
    }) => {
      const { data, error } = await supabaseAny
        .from('deals')
        .update({ payment_status: paymentStatus })
        .eq('id', dealId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}