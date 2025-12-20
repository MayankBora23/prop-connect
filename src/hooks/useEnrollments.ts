import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';

export type EnrollmentStatus = 'active' | 'completed' | 'cancelled' | 'on_hold';

export type Enrollment = {
  id: string;
  student_id: string;
  batch_id: string;
  enrollment_date: string;
  status: EnrollmentStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  company_id: string | null;
};

export type EnrollmentInsert = Omit<Enrollment, 'id' | 'created_at' | 'updated_at' | 'company_id'>;
export type EnrollmentUpdate = Partial<EnrollmentInsert>;

export function useEnrollments() {
  const { data: company } = useCurrentCompany();
  
  return useQuery({
    queryKey: ['enrollments', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          students:student_id (name, phone),
          batches:batch_id (
            name,
            courses:course_id (name)
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

export function useCreateEnrollment() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (enrollment: EnrollmentInsert) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('enrollments')
        .insert({
          ...enrollment,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Enrollment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
  });
}

export function useUpdateEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: EnrollmentUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('enrollments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Enrollment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
  });
}

