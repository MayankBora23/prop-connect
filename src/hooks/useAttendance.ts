import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';

export type AttendanceStatus = 'present' | 'absent';
export type TeacherAttendanceStatus = 'present' | 'half_day' | 'absent';

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

export type TeacherAttendance = {
  id: string;
  teacher_id: string;
  attendance_date: string;
  status: TeacherAttendanceStatus;
  notes: string | null;
  marked_by: string | null;
  created_at: string;
  updated_at: string;
  company_id: string | null;
};

export type TeacherAttendanceInsert = Omit<TeacherAttendance, 'id' | 'created_at' | 'updated_at' | 'company_id'>;
export type TeacherAttendanceUpdate = Partial<TeacherAttendanceInsert>;

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

export function useBatchEnrollments(batchId?: string) {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['batch-enrollments', company?.id, batchId],
    queryFn: async () => {
      if (!company?.id || !batchId) return [];

      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          students:student_id (
            id,
            name,
            phone
          )
        `)
        .eq('company_id', company.id)
        .eq('batch_id', batchId)
        .eq('status', 'active')
        .order('enrollment_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id && !!batchId,
  });
}

export function useAttendanceByDate(date?: string) {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['attendance-by-date', company?.id, date],
    queryFn: async () => {
      if (!company?.id || !date) return [];

      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          enrollments:enrollment_id (
            id,
            batch_id,
            student_id,
            students:student_id (
              name,
              phone
            ),
            batches:batch_id (
              name,
              courses:course_id (
                name
              )
            )
          )
        `)
        .eq('company_id', company.id)
        .eq('attendance_date', date)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id && !!date,
  });
}

export function useBulkAttendance() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async ({ attendances }: { attendances: AttendanceInsert[] }) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('attendance')
        .insert(
          attendances.map(attendance => ({
            ...attendance,
            company_id: company.id,
          }))
        )
        .select();

      if (error) throw error;
      return data as Attendance[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function useTeacherAttendance(date?: string) {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['teacher-attendance', company?.id, date],
    queryFn: async () => {
      if (!company?.id || !date) return [];

      const { data, error } = await supabase
        .from('teacher_attendance')
        .select(`
          *,
          teachers:teacher_id (
            id,
            name,
            phone
          )
        `)
        .eq('company_id', company.id)
        .eq('attendance_date', date)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id && !!date,
  });
}

export function useBulkTeacherAttendance() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async ({ attendances }: { attendances: TeacherAttendanceInsert[] }) => {
      if (!company?.id) throw new Error('No company found');

      // First, delete existing teacher attendance records for this date
      const teacherIds = attendances.map(att => att.teacher_id);
      const attendanceDate = attendances[0]?.attendance_date;

      const { error: deleteError } = await supabase
        .from('teacher_attendance')
        .delete()
        .in('teacher_id', teacherIds)
        .eq('attendance_date', attendanceDate);

      if (deleteError) throw deleteError;

      // Then insert new attendance records
      const { data, error } = await supabase
        .from('teacher_attendance')
        .insert(
          attendances.map(attendance => ({
            ...attendance,
            company_id: company.id,
          }))
        )
        .select();

      if (error) throw error;
      return data as TeacherAttendance[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-attendance'] });
    },
  });
}

