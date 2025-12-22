import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Prescription = Tables<'prescriptions'>;
export type PrescriptionInsert = TablesInsert<'prescriptions'>;
export type PrescriptionUpdate = TablesUpdate<'prescriptions'>;

export function usePrescriptions() {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['prescriptions', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('prescriptions')
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
            doctor_name
          )
        `)
        .eq('company_id', company.id)
        .order('prescribed_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });
}

export function usePrescription(id: string) {
  return useQuery({
    queryKey: ['prescription', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          *,
          patients (
            id,
            name,
            medical_id,
            date_of_birth
          ),
          appointments (
            id,
            appointment_date,
            doctor_name,
            diagnosis
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function usePatientPrescriptions(patientId: string) {
  return useQuery({
    queryKey: ['patient_prescriptions', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          *,
          appointments (
            id,
            appointment_date,
            doctor_name
          )
        `)
        .eq('patient_id', patientId)
        .order('prescribed_date', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePrescription() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (prescription: PrescriptionInsert) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('prescriptions')
        .insert({
          ...prescription,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Prescription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
    },
  });
}

export function useUpdatePrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: PrescriptionUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('prescriptions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Prescription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
    },
  });
}

export function useDeletePrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('prescriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
    },
  });
}
