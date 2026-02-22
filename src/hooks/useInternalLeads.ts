import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Enums } from '@/integrations/supabase/types';

export type InternalLeadStage =
  | 'new'
  | 'contacted'
  | 'demo_scheduled'
  | 'trial_started'
  | 'closed_won'
  | 'closed_lost';

export type InternalLead = {
  id: string;
  company_name: string;
  lead_name: string;
  phone_no: string | null;
  address: string | null;
  industry: Enums<'industry_type'>;
  user_limit: number | null;
  stage: InternalLeadStage;
  is_telephony_enabled: boolean | null;
  last_called_at: string | null;
  created_at: string;
  created_by: string;
};

export function useInternalLeads() {
  return useQuery({
    queryKey: ['internalLeads'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('internal_leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as InternalLead[];
    },
  });
}

type CreateInternalLeadInput = {
  company_name: string;
  lead_name: string;
  phone_no?: string;
  address?: string;
  industry: Enums<'industry_type'>;
  user_limit?: number;
  stage?: InternalLeadStage;
};

export function useCreateInternalLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateInternalLeadInput) => {
      const { data, error } = await (supabase as any)
        .from('internal_leads')
        .insert({
          company_name: payload.company_name,
          lead_name: payload.lead_name,
          phone_no: payload.phone_no ?? null,
          address: payload.address ?? null,
          industry: payload.industry,
          user_limit: payload.user_limit ?? null,
          stage: payload.stage ?? 'new',
        })
        .select('*')
        .single();

      if (error) throw error;
      return data as InternalLead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internalLeads'] });
    },
  });
}

type UpdateInternalLeadInput = Partial<Omit<InternalLead, 'id'>> & { id: string };

export function useUpdateInternalLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateInternalLeadInput) => {
      const { data, error } = await (supabase as any)
        .from('internal_leads')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return data as InternalLead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internalLeads'] });
    },
  });
}

export function useDeleteInternalLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('internal_leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internalLeads'] });
    },
  });
}

