import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Billing = Tables<'billing'>;
export type BillingInsert = TablesInsert<'billing'>;
export type BillingUpdate = TablesUpdate<'billing'>;

export function useBilling() {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['billing', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('billing')
        .select(`
          *,
          patients (
            id,
            name,
            medical_id
          ),
          appointments (
            id,
            appointment_date,
            doctor_name,
            appointment_type
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

export function useBillingRecord(id: string) {
  return useQuery({
    queryKey: ['billing_record', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing')
        .select(`
          *,
          patients (
            id,
            name,
            medical_id,
            phone,
            email
          ),
          appointments (
            id,
            appointment_date,
            appointment_time,
            doctor_name,
            appointment_type
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function usePatientBilling(patientId: string) {
  return useQuery({
    queryKey: ['patient_billing', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing')
        .select(`
          *,
          appointments (
            id,
            appointment_date,
            doctor_name,
            appointment_type
          )
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateBilling() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (billing: BillingInsert) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('billing')
        .insert({
          ...billing,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Billing;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });
}

export function useUpdateBilling() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: BillingUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('billing')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Billing;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });
}

export function useDeleteBilling() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('billing')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });
}
