import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';

// Cast supabase to any to bypass type checking for automobile tables
const supabaseAny = supabase as any;

export interface AutoLead {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  preferred_vehicle_type?: 'car' | 'bike' | null;
  preferred_brand?: string | null;
  preferred_model?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  financing_needed: boolean;
  insurance_needed: boolean;
  test_drive_requested: boolean;
  source?: string | null;
  status: string;
  notes: string[];
  tags: string[];
  assigned_to?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  last_contact?: string | null;
  company_id: string;
}

export type AutoLeadInsert = Omit<AutoLead, 'id' | 'created_at' | 'updated_at' | 'company_id'>;
export type AutoLeadUpdate = Partial<AutoLeadInsert>;

export function useAutoLeads() {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['auto_leads', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabaseAny
        .from('auto_leads')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any as AutoLead[];
    },
    enabled: !!company?.id,
  });
}

export function useAutoLead(id: string) {
  return useQuery({
    queryKey: ['auto_lead', id],
    queryFn: async () => {
      const { data, error } = await supabaseAny
        .from('auto_leads')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as any as AutoLead | null;
    },
  });
}

export function useCreateAutoLead() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (lead: AutoLeadInsert) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabaseAny
        .from('auto_leads')
        .insert({
          ...lead,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as any as AutoLead;
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
      const { data, error } = await supabaseAny
        .from('auto_leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as any as AutoLead;
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
      const { error } = await supabaseAny
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
