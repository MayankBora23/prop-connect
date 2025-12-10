import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type SiteVisit = Tables<'site_visits'>;
export type SiteVisitInsert = TablesInsert<'site_visits'>;
export type SiteVisitUpdate = TablesUpdate<'site_visits'>;

export type SiteVisitWithDetails = SiteVisit & {
  leads: { name: string } | null;
  properties: { title: string } | null;
  profiles: { name: string } | null;
};

export function useSiteVisits() {
  return useQuery({
    queryKey: ['site_visits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_visits')
        .select(`
          *,
          leads!site_visits_lead_id_fkey(name),
          properties!site_visits_property_id_fkey(title)
        `)
        .order('visit_date', { ascending: true });
      
      if (error) throw error;
      return data as SiteVisitWithDetails[];
    },
  });
}

async function getUserCompanyId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).maybeSingle();
  return data?.company_id || null;
}

export function useCreateSiteVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (visit: SiteVisitInsert) => {
      const company_id = await getUserCompanyId();
      if (!company_id) throw new Error('No company found');
      
      const { data, error } = await supabase
        .from('site_visits')
        .insert({ ...visit, company_id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site_visits'] });
    },
  });
}

export function useUpdateSiteVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: SiteVisitUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('site_visits')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site_visits'] });
    },
  });
}

export function useDeleteSiteVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('site_visits')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site_visits'] });
    },
  });
}
