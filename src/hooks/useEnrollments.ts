import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';

export type EnrollmentStatus = 'active' | 'completed';

export type Enrollment = {
  id: string;
  student_id: string;
  batch_id: string;
  enrollment_date: string;
  status: EnrollmentStatus;
  total_fees: number;
  fees_paid: number;
  fees_pending: number;
  teacher_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  company_id: string | null;
  // Relations
  students?: {
    name: string;
    phone: string;
    stage: string;
  };
  batches?: {
    name: string;
    courses?: {
      name: string;
    };
  };
  teachers?: {
    name: string;
  };
};

export type EnrollmentInsert = Omit<Enrollment, 'id' | 'created_at' | 'updated_at' | 'company_id'>;
export type EnrollmentUpdate = Partial<EnrollmentInsert>;

export function useEnrolledStudents() {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['enrolled-students', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      // First get all students in enrolled stage
      const { data: students, error: studentsError } = await (supabase as any)
        .from('students')
        .select('*')
        .eq('company_id', company.id)
        .eq('stage', 'enrolled')
        .order('created_at', { ascending: false });

      if (studentsError) throw studentsError;

      // For each student, get their enrollment if it exists
      const studentsWithEnrollments = await Promise.all(
        (students || []).map(async (student) => {
          const { data: enrollment } = await (supabase as any)
            .from('enrollments')
            .select(`
              id,
              batch_id,
              enrollment_date,
              status,
              total_fees,
              fees_paid,
              fees_pending,
              teacher_id,
              notes,
              batches:batch_id (
                name,
                courses:course_id (name)
              ),
              teachers:teacher_id (
                name
              )
            `)
            .eq('student_id', student.id)
            .eq('company_id', company.id)
            .maybeSingle();

          return {
            ...student,
            enrollment: enrollment || null,
          };
        })
      );

      return studentsWithEnrollments;
    },
    enabled: !!company?.id,
  });
}

export function useEnrollments() {
  const { data: company } = useCurrentCompany();
  
  return useQuery({
    queryKey: ['enrollments', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await (supabase as any)
        .from('enrollments')
        .select(`
          *,
          students:student_id (
            name,
            phone,
            stage
          ),
          batches:batch_id (
            name,
            courses:course_id (name)
          ),
          teachers:teacher_id (
            name
          )
        `)
        .eq('company_id', company.id)
        .order('enrollment_date', { ascending: false });

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

      const { data, error } = await (supabase as any)
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
      queryClient.invalidateQueries({ queryKey: ['enrolled-students'] });
    },
  });
}

export function useUpdateEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: EnrollmentUpdate & { id: string }) => {
      const { data, error } = await (supabase as any)
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
      queryClient.invalidateQueries({ queryKey: ['enrolled-students'] });
    },
  });
}

export function useDeleteEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('enrollments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['enrolled-students'] });
    },
  });
}