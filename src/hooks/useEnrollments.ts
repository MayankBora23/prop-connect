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

// Installment types
export type Installment = {
  id: string;
  enrollment_id: string;
  amount_due: number;
  status: 'pending' | 'paid';
  due_date: string;
  created_at: string;
  updated_at: string;
  company_id: string | null;
};

export type InstallmentInsert = Omit<Installment, 'id' | 'created_at' | 'updated_at'>;

// Hook to fetch installments for an enrollment
export function useEnrollmentInstallments(enrollmentId: string | null) {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['enrollment-installments', enrollmentId, company?.id],
    queryFn: async () => {
      if (!company?.id || !enrollmentId) return [];

      const { data, error } = await (supabase as any)
        .from('enrollment_installments')
        .select('*')
        .eq('enrollment_id', enrollmentId)
        .eq('company_id', company.id)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as Installment[];
    },
    enabled: !!company?.id && !!enrollmentId,
  });
}

// Hook to create installments
export function useCreateInstallments() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (installments: InstallmentInsert[]) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await (supabase as any)
        .from('enrollment_installments')
        .insert(installments.map(installment => ({
          ...installment,
          company_id: company.id,
        })))
        .select();

      if (error) throw error;
      return data as Installment[];
    },
    onSuccess: (_, variables) => {
      // Invalidate queries for all affected enrollments
      const enrollmentIds = [...new Set(variables.map(inst => inst.enrollment_id))];
      enrollmentIds.forEach(enrollmentId => {
        queryClient.invalidateQueries({ queryKey: ['enrollment-installments', enrollmentId] });
      });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['enrolled-students'] });
    },
  });
}

// Hook to update installment status
export function useUpdateInstallment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<InstallmentInsert>) => {
      const { data, error } = await (supabase as any)
        .from('enrollment_installments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Installment;
    },
    onMutate: async ({ id, ...updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['enrollment-installments'] });

      // Snapshot the previous value
      const previousInstallments = queryClient.getQueryData(['enrollment-installments']);

      // Optimistically update the cache
      queryClient.setQueriesData(
        { queryKey: ['enrollment-installments'], exact: false },
        (old: Installment[] | undefined) => {
          if (!old) return old;
          return old.map(installment =>
            installment.id === id ? { ...installment, ...updates } : installment
          );
        }
      );

      // Return a context object with the snapshotted value
      return { previousInstallments };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousInstallments) {
        queryClient.setQueriesData(['enrollment-installments'], context.previousInstallments);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['enrollment-installments', data.enrollment_id] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['enrolled-students'] });
    },
  });
}

// Hook to mark full payment for an enrollment
export function useMarkFullPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enrollmentId: string) => {
      // First get the current enrollment to know the total_fees
      const { data: enrollment, error: fetchError } = await (supabase as any)
        .from('enrollments')
        .select('total_fees, fees_paid')
        .eq('id', enrollmentId)
        .single();

      if (fetchError) throw fetchError;

      const totalFees = enrollment.total_fees || 0;
      const currentlyPaid = enrollment.fees_paid || 0;
      const remainingAmount = totalFees - currentlyPaid;

      // Update the enrollment to mark as fully paid
      const { data, error } = await (supabase as any)
        .from('enrollments')
        .update({
          fees_paid: totalFees,
          fees_pending: 0,
        })
        .eq('id', enrollmentId)
        .select()
        .single();

      if (error) throw error;
      return { data, remainingAmount };
    },
    onMutate: async (enrollmentId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['enrollments'] });
      await queryClient.cancelQueries({ queryKey: ['enrolled-students'] });

      // Snapshot the previous values
      const previousEnrollments = queryClient.getQueryData(['enrollments']);
      const previousEnrolledStudents = queryClient.getQueryData(['enrolled-students']);

      // Optimistically update enrollments
      queryClient.setQueriesData(
        { queryKey: ['enrollments'], exact: false },
        (old: Enrollment[] | undefined) => {
          if (!old) return old;
          return old.map(enrollment =>
            enrollment.id === enrollmentId
              ? { ...enrollment, fees_paid: enrollment.total_fees, fees_pending: 0 }
              : enrollment
          );
        }
      );

      // Optimistically update enrolled students
      queryClient.setQueriesData(
        { queryKey: ['enrolled-students'], exact: false },
        (old: any[] | undefined) => {
          if (!old) return old;
          return old.map(student =>
            student.enrollment?.id === enrollmentId
              ? {
                  ...student,
                  enrollment: {
                    ...student.enrollment,
                    fees_paid: student.enrollment.total_fees,
                    fees_pending: 0
                  }
                }
              : student
          );
        }
      );

      // Return a context object with the snapshotted values
      return { previousEnrollments, previousEnrolledStudents };
    },
    onError: (err, enrollmentId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousEnrollments) {
        queryClient.setQueriesData(['enrollments'], context.previousEnrollments);
      }
      if (context?.previousEnrolledStudents) {
        queryClient.setQueriesData(['enrolled-students'], context.previousEnrolledStudents);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['enrolled-students'] });
    },
  });
}