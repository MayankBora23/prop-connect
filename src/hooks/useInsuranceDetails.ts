import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type InsuranceDetail = Tables<'insurance_details'>;
export type InsuranceDetailInsert = TablesInsert<'insurance_details'>;
export type InsuranceDetailUpdate = TablesUpdate<'insurance_details'>;

export function useInsuranceDetails() {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['insurance_details', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('insurance_details')
        .select(`
          *,
          patients (
            id,
            name,
            medical_id
          )
        `)
        .eq('company_id', company.id)
        .order('valid_until', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });
}

export function useInsuranceDetail(id: string) {
  return useQuery({
    queryKey: ['insurance_detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_details')
        .select(`
          *,
          patients (
            id,
            name,
            medical_id,
            date_of_birth
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function usePatientInsuranceDetails(patientId: string) {
  return useQuery({
    queryKey: ['patient_insurance_details', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_details')
        .select('*')
        .eq('patient_id', patientId)
        .order('valid_until', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateInsuranceDetail() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (insurance: InsuranceDetailInsert) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('insurance_details')
        .insert({
          ...insurance,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as InsuranceDetail;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance_details'] });
    },
  });
}

export function useUpdateInsuranceDetail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: InsuranceDetailUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('insurance_details')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as InsuranceDetail;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance_details'] });
    },
  });
}

export function useDeleteInsuranceDetail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('insurance_details')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance_details'] });
    },
  });
}
