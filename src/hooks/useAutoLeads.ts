import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type AutoLead = Tables<'auto_leads'>;
export type AutoLeadInsert = TablesInsert<'auto_leads'>;
export type AutoLeadUpdate = TablesUpdate<'auto_leads'>;

export function useAutoLeads() {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['auto_leads', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('auto_leads')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AutoLead[];
    },
    enabled: !!company?.id,
  });
}

export function useAutoLead(id: string) {
  return useQuery({
    queryKey: ['auto_lead', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auto_leads')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as AutoLead | null;
    },
  });
}

export function useCreateAutoLead() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (lead: AutoLeadInsert) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('auto_leads')
        .insert({
          ...lead,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AutoLead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto_leads'] });
    },
  });
}

export function useUpdateAutoLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AutoLeadUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('auto_leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as AutoLead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto_leads'] });
    },
  });
}

export function useDeleteAutoLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('auto_leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto_leads'] });
    },
  });
}
