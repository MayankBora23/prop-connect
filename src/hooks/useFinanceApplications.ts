import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';

// Cast supabase to any to bypass type checking for automobile tables
const supabaseAny = supabase as any;

export type FinanceApplication = Tables<'finance_applications'>;
export type FinanceApplicationInsert = TablesInsert<'finance_applications'>;
export type FinanceApplicationUpdate = TablesUpdate<'finance_applications'>;

export function useFinanceApplications() {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['finance_applications', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabaseAny
        .from('finance_applications')
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

export function useFinanceApplication(id: string) {
  return useQuery({
    queryKey: ['finance_application', id],
    queryFn: async () => {
      const { data, error } = await supabaseAny
        .from('finance_applications')
        .select(`
          *,
          auto_leads (
            id,
            name,
            phone,
            email,
            monthly_income
          ),
          deals (
            id,
            deal_number,
            final_price,
            down_payment
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateFinanceApplication() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (application: FinanceApplicationInsert) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabaseAny
        .from('finance_applications')
        .insert({
          ...application,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as FinanceApplication;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance_applications'] });
    },
  });
}

export function useUpdateFinanceApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: FinanceApplicationUpdate & { id: string }) => {
      const { data, error } = await supabaseAny
        .from('finance_applications')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as FinanceApplication;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance_applications'] });
    },
  });
}

export function useDeleteFinanceApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('finance_applications')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance_applications'] });
    },
  });
}
