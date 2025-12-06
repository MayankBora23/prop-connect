import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type FollowUp = Tables<'follow_ups'>;
export type FollowUpInsert = TablesInsert<'follow_ups'>;
export type FollowUpUpdate = TablesUpdate<'follow_ups'>;

export type FollowUpWithLead = FollowUp & {
  leads: { name: string } | null;
};

export function useFollowUps() {
  return useQuery({
    queryKey: ['follow_ups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('follow_ups')
        .select(`
          *,
          leads!follow_ups_lead_id_fkey(name)
        `)
        .order('follow_up_date', { ascending: true });
      
      if (error) throw error;
      return data as FollowUpWithLead[];
    },
  });
}

export function useCreateFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (followUp: FollowUpInsert) => {
      const { data, error } = await supabase
        .from('follow_ups')
        .insert(followUp)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow_ups'] });
    },
  });
}

export function useUpdateFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: FollowUpUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('follow_ups')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow_ups'] });
    },
  });
}

export function useDeleteFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('follow_ups')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow_ups'] });
    },
  });
}
