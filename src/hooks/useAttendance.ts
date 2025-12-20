import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export type Attendance = {
  id: string;
  enrollment_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  notes: string | null;
  marked_by: string | null;
  created_at: string;
  updated_at: string;
  company_id: string | null;
};

export type AttendanceInsert = Omit<Attendance, 'id' | 'created_at' | 'updated_at' | 'company_id'>;
export type AttendanceUpdate = Partial<AttendanceInsert>;

export function useAttendance(enrollmentId?: string) {
  const { data: company } = useCurrentCompany();
  
  return useQuery({
    queryKey: ['attendance', company?.id, enrollmentId],
    queryFn: async () => {
      if (!company?.id) return [];
      
      let query = supabase
        .from('attendance')
        .select('*, enrollments(students(name), batches(name))')
        .eq('company_id', company.id);

      if (enrollmentId) {
        query = query.eq('enrollment_id', enrollmentId);
      }

      const { data, error } = await query.order('attendance_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });
}

export function useCreateAttendance() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (attendance: AttendanceInsert) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('attendance')
        .insert({
          ...attendance,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Attendance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function useUpdateAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AttendanceUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('attendance')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Attendance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

