import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';

export type EmployeeAttendance = {
  id: string;
  employee_id: string;
  attendance_date: string;
  status: 'present' | 'absent' | 'half_day' | 'leave';
  check_in_time: string | null;
  check_out_time: string | null;
  work_duration: string | null; // INTERVAL type from PostgreSQL
  leave_type: 'casual' | 'sick' | 'paid' | 'unpaid' | null;
  remarks: string | null;
  is_manual_override: boolean;
  created_at: string;
  updated_at: string;
  company_id: string | null;
  created_by: string | null;
  // Relations
  employee?: {
    employee_id: string;
    full_name: string;
    role: string;
    department: string | null;
  };
};

export type EmployeeAttendanceInsert = Omit<EmployeeAttendance, 'id' | 'created_at' | 'updated_at' | 'company_id' | 'work_duration' | 'is_manual_override' | 'created_by'>;
export type EmployeeAttendanceUpdate = Partial<EmployeeAttendanceInsert>;

export type AttendanceStats = {
  total_days: number;
  present_days: number;
  absent_days: number;
  half_days: number;
  leave_days: number;
  total_hours: number;
};

// Get today's attendance for all employees
export function useTodayAttendance() {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['today-attendance', company?.id],
    staleTime: 60_000,
    queryFn: async () => {
      if (!company?.id) return [];

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await (supabase as any)
        .from('employee_attendance')
        .select(`
          *,
          employee:employees(
            employee_id,
            full_name,
            role,
            department
          )
        `)
        .eq('company_id', company.id)
        .eq('attendance_date', today)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EmployeeAttendance[];
    },
    enabled: !!company?.id,
  });
}

// Get attendance for a specific date
export function useAttendanceByDate(date: string) {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['attendance-by-date', company?.id, date],
    staleTime: 60_000,
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await (supabase as any)
        .from('employee_attendance')
        .select(`
          *,
          employee:employees(
            employee_id,
            full_name,
            role,
            department
          )
        `)
        .eq('company_id', company.id)
        .eq('attendance_date', date)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EmployeeAttendance[];
    },
    enabled: !!company?.id && !!date,
  });
}

// Get attendance history for a specific employee
export function useEmployeeAttendanceHistory(employeeId: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['employee-attendance-history', employeeId, startDate, endDate],
    staleTime: 60_000,
    queryFn: async () => {
      let query = (supabase as any)
        .from('employee_attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .order('attendance_date', { ascending: false });

      if (startDate) {
        query = query.gte('attendance_date', startDate);
      }

      if (endDate) {
        query = query.lte('attendance_date', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EmployeeAttendance[];
    },
    enabled: !!employeeId,
  });
}

// Get monthly attendance summary for an employee
export function useMonthlyAttendance(employeeId: string, year: number, month: number) {
  return useQuery({
    queryKey: ['monthly-attendance', employeeId, year, month],
    staleTime: 60_000,
    queryFn: async () => {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      const { data, error } = await (supabase as any)
        .from('employee_attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)
        .order('attendance_date', { ascending: true });

      if (error) throw error;
      return data as EmployeeAttendance[];
    },
    enabled: !!employeeId,
  });
}

// Mark attendance for an employee
export function useMarkAttendance() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (attendance: EmployeeAttendanceInsert) => {
      if (!company?.id) throw new Error('No company found');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if attendance already exists for this employee on this date
      const { data: existing, error: checkError } = await (supabase as any)
        .from('employee_attendance')
        .select('id')
        .eq('employee_id', attendance.employee_id)
        .eq('attendance_date', attendance.attendance_date)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        // Update existing record
        const { data, error } = await (supabase as any)
          .from('employee_attendance')
          .update({
            ...attendance,
            is_manual_override: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data as EmployeeAttendance;
      } else {
        // Create new record
        const { data, error } = await (supabase as any)
          .from('employee_attendance')
          .insert({
            ...attendance,
            company_id: company.id,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        return data as EmployeeAttendance;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-by-date'] });
      queryClient.invalidateQueries({ queryKey: ['employee-attendance-history'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-attendance'] });
    },
  });
}

// Bulk mark attendance for multiple employees
export function useBulkMarkAttendance() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (attendances: EmployeeAttendanceInsert[]) => {
      if (!company?.id) throw new Error('No company found');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const records = attendances.map(attendance => ({
        ...attendance,
        company_id: company.id,
        created_by: user.id,
        is_manual_override: true,
      }));

      const { data, error } = await (supabase as any)
        .from('employee_attendance')
        .upsert(records, {
          onConflict: 'employee_id,attendance_date',
          ignoreDuplicates: false
        })
        .select();

      if (error) throw error;
      return data as EmployeeAttendance[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-by-date'] });
      queryClient.invalidateQueries({ queryKey: ['employee-attendance-history'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-attendance'] });
    },
  });
}

// Get attendance statistics for an employee within a date range
export function useAttendanceStats(employeeId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['attendance-stats', employeeId, startDate, endDate],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('employee_attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate);

      if (error) throw error;

      const attendances = data as EmployeeAttendance[];
      const stats: AttendanceStats = {
        total_days: attendances.length,
        present_days: attendances.filter(a => a.status === 'present').length,
        absent_days: attendances.filter(a => a.status === 'absent').length,
        half_days: attendances.filter(a => a.status === 'half_day').length,
        leave_days: attendances.filter(a => a.status === 'leave').length,
        total_hours: attendances.reduce((total, a) => {
          if (a.work_duration) {
            // Parse PostgreSQL interval to hours
            const hours = parseFloat(a.work_duration.split(':')[0]) +
                         parseFloat(a.work_duration.split(':')[1]) / 60;
            return total + hours;
          }
          return total;
        }, 0),
      };

      return stats;
    },
    enabled: !!employeeId && !!startDate && !!endDate,
  });
}