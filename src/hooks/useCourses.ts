import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';

export type Course = {
  id: string;
  name: string;
  description: string | null;
  duration_months: number | null;
  price: string | null;
  instructor_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  company_id: string | null;
};

export type CourseInsert = Omit<Course, 'id' | 'created_at' | 'updated_at' | 'company_id'>;
export type CourseUpdate = Partial<CourseInsert>;

export function useCourses() {
  const { data: company } = useCurrentCompany();
  
  return useQuery({
    queryKey: ['courses', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Course[];
    },
    enabled: !!company?.id,
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (course: CourseInsert) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('courses')
        .insert({
          ...course,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Course;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: CourseUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('courses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Course;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

