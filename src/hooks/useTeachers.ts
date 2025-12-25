import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';

export type TeacherStatus = 'active' | 'inactive';

export type Teacher = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  qualifications: string[] | null;
  subjects: string[] | null;
  experience_years: number | null;
  specialization: string | null;
  joining_date: string | null;
  status: TeacherStatus;
  salary: number | null;
  address: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  company_id: string | null;
};

export type TeacherInsert = Omit<Teacher, 'id' | 'created_at' | 'updated_at' | 'company_id'>;
export type TeacherUpdate = Partial<TeacherInsert>;

export function useTeachers() {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['teachers', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await (supabase as any)
        .from('teachers')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Teacher[];
    },
    enabled: !!company?.id,
  });
}

export function useTeacher(id: string) {
  return useQuery({
    queryKey: ['teacher', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('teachers')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as Teacher | null;
    },
  });
}

export function useCreateTeacher() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (teacher: TeacherInsert) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await (supabase as any)
        .from('teachers')
        .insert({
          ...teacher,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Teacher;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
  });
}

export function useUpdateTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TeacherUpdate & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('teachers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Teacher;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
  });
}

export function useDeleteTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('teachers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
  });
}
