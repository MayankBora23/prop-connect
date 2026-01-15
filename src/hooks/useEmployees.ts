import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';

export type Employee = {
  id: string;
  employee_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  role: string;
  department: string | null;
  employment_type: 'full-time' | 'part-time' | 'contract';
  salary: number | null;
  date_of_joining: string | null;
  reporting_manager: string | null;
  address: string | null;
  aadhaar_number: string | null;
  pan_number: string | null;
  bank_account_holder_name: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_ifsc_code: string | null;
  created_at: string;
  updated_at: string;
  company_id: string | null;
  created_by: string | null;
};

export type EmployeeInsert = Omit<Employee, 'id' | 'created_at' | 'updated_at' | 'company_id' | 'employee_id' | 'created_by'>;
export type EmployeeUpdate = Partial<EmployeeInsert>;

export function useEmployees() {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['employees', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await (supabase as any)
        .from('employees')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!company?.id,
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('employees')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as Employee | null;
    },
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (employee: EmployeeInsert) => {
      if (!company?.id) throw new Error('No company found');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await (supabase as any)
        .from('employees')
        .insert({
          ...employee,
          company_id: company.id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: EmployeeUpdate & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('employees')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee'] });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}