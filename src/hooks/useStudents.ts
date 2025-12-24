import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';

export type Student = {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  date_of_birth: string | null;
  address: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  notes: string[] | null;
  tags: string[] | null;
  stage: 'new_students' | 'contacted' | 'demo_scheduled' | 'demo_attended' | 'interested' | 'fees_discussed' | 'enrolled' | 'lost';
  created_by: string | null;
  created_at: string;
  updated_at: string;
  company_id: string | null;
};

export type StudentInsert = Omit<Student, 'id' | 'created_at' | 'updated_at' | 'company_id'>;
export type StudentUpdate = Partial<StudentInsert>;

export function useStudents() {
  const { data: company } = useCurrentCompany();
  
  return useQuery({
    queryKey: ['students', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Student[];
    },
    enabled: !!company?.id,
  });
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: ['student', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as Student | null;
    },
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (student: StudentInsert) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('students')
        .insert({
          ...student,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: StudentUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('students')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

