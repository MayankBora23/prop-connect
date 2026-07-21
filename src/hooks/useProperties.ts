import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { getCompanyId } from '@/lib/getCompanyId';
import { useCurrentCompany } from '@/hooks/useCompany';

export type Property = Tables<'properties'>;
export type PropertyInsert = Omit<TablesInsert<'properties'>, 'company_id'>;
export type PropertyUpdate = TablesUpdate<'properties'>;

export function useProperties() {
  const { data: company } = useCurrentCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['properties', companyId],
    enabled: !!companyId,
    staleTime: 60_000,
    queryFn: async () => {
      const company_id = await getCompanyId();
      if (!company_id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('company_id', company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Property[];
    },
  });
}

export function useProperty(id: string) {
  const { data: company } = useCurrentCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['properties', id, companyId],
    enabled: !!id && !!companyId,
    staleTime: 60_000,
    queryFn: async () => {
      const company_id = await getCompanyId();
      if (!company_id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .eq('company_id', company_id)
        .maybeSingle();

      if (error) throw error;
      return data as Property | null;
    },
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (property: PropertyInsert) => {
      const company_id = await getCompanyId();
      if (!company_id) throw new Error('No company found');
      
      const { data, error } = await supabase
        .from('properties')
        .insert({ ...property, company_id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}

export function useUpdateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: PropertyUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}
