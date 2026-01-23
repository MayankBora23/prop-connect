import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';

export type Batch = {
  id: string;
  course_id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  schedule: string | null;
  max_students: number | null;
  instructor_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  company_id: string | null;
  // Relations
  teachers?: {
    name: string;
  };
};

export type BatchInsert = Omit<Batch, 'id' | 'created_at' | 'updated_at' | 'company_id'>;
export type BatchUpdate = Partial<BatchInsert>;

export function useBatches() {
  const { data: company } = useCurrentCompany();
  
  return useQuery({
    queryKey: ['batches', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await (supabase as any)
        .from('batches')
        .select(`
          *,
          courses:course_id (
            name,
            price
          ),
          teachers:instructor_id (
            name
          )
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (Batch & { courses: { name: string; price: string } | null })[];
    },
    enabled: !!company?.id,
  });
}

export function useCreateBatch() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (batch: BatchInsert) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await (supabase as any)
        .from('batches')
        .insert({
          ...batch,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Batch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
  });
}

export function useUpdateBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: BatchUpdate & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('batches')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Batch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
  });
}

export function useDeleteBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('batches')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
  });
}
