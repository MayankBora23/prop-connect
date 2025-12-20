import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';

export type FeeStatus = 'pending' | 'paid' | 'overdue' | 'partial';

export type Fee = {
  id: string;
  enrollment_id: string;
  fee_type: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: FeeStatus;
  payment_method: string | null;
  transaction_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  company_id: string | null;
};

export type FeeInsert = Omit<Fee, 'id' | 'created_at' | 'updated_at' | 'company_id'>;
export type FeeUpdate = Partial<FeeInsert>;

export function useFees(enrollmentId?: string) {
  const { data: company } = useCurrentCompany();
  
  return useQuery({
    queryKey: ['fees', company?.id, enrollmentId],
    queryFn: async () => {
      if (!company?.id) return [];
      
      let query = supabase
        .from('fees')
        .select('*, enrollments(students(name), batches(name))')
        .eq('company_id', company.id);

      if (enrollmentId) {
        query = query.eq('enrollment_id', enrollmentId);
      }

      const { data, error } = await query.order('due_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });
}

export function useCreateFee() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (fee: FeeInsert) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('fees')
        .insert({
          ...fee,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Fee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
    },
  });
}

export function useUpdateFee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: FeeUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('fees')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Fee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
    },
  });
}

