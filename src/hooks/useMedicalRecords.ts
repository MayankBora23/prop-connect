import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type MedicalRecord = Tables<'medical_records'>;
export type MedicalRecordInsert = TablesInsert<'medical_records'>;
export type MedicalRecordUpdate = TablesUpdate<'medical_records'>;

export function useMedicalRecords() {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['medical_records', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('medical_records')
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
            appointment_time,
            doctor_name
          )
        `)
        .eq('company_id', company.id)
        .order('record_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });
}

export function useMedicalRecord(id: string) {
  return useQuery({
    queryKey: ['medical_record', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_records')
        .select(`
          *,
          patients (
            id,
            name,
            medical_id,
            date_of_birth,
            phone
          ),
          appointments (
            id,
            appointment_date,
            appointment_time,
            doctor_name,
            diagnosis,
            treatment
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function usePatientMedicalRecords(patientId: string) {
  return useQuery({
    queryKey: ['patient_medical_records', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_records')
        .select(`
          *,
          appointments (
            id,
            appointment_date,
            appointment_time,
            doctor_name
          )
        `)
        .eq('patient_id', patientId)
        .order('record_date', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateMedicalRecord() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (record: MedicalRecordInsert) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('medical_records')
        .insert({
          ...record,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MedicalRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical_records'] });
    },
  });
}

export function useUpdateMedicalRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: MedicalRecordUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('medical_records')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MedicalRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical_records'] });
    },
  });
}

export function useDeleteMedicalRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('medical_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical_records'] });
    },
  });
}
