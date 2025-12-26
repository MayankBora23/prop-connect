import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';
import { QuoteWithRelations } from './useAutoTypes';

// Cast supabase to any to bypass type checking for automobile tables
const supabaseAny = supabase as any;

export type Quote = QuoteWithRelations;
export type QuoteInsert = Omit<Quote, 'id' | 'created_at' | 'updated_at' | 'company_id'>;
export type QuoteUpdate = Partial<QuoteInsert>;

export function useQuotes() {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['quotes', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabaseAny
        .from('quotes')
        .select(`
          *,
          auto_leads (
            id,
            name,
            phone,
            email
          ),
          vehicles (
            id,
            brand,
            model,
            year,
            fuel_type
          )
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as QuoteWithRelations[];
    },
    enabled: !!company?.id,
  });
}

export function useQuote(id: string) {
  return useQuery({
    queryKey: ['quote', id],
    queryFn: async () => {
      const { data, error } = await supabaseAny
        .from('quotes')
        .select(`
          *,
          auto_leads (
            id,
            name,
            phone,
            email,
            preferred_brand,
            preferred_model
          ),
          vehicles (
            id,
            brand,
            model,
            year,
            fuel_type,
            transmission,
            price
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as QuoteWithRelations[];
    },
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (quote: QuoteInsert) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabaseAny
        .from('quotes')
        .insert({
          ...quote,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as QuoteWithRelations;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: QuoteUpdate & { id: string }) => {
      const { data, error } = await supabaseAny
        .from('quotes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as QuoteWithRelations;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
}

export function useDeleteQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseAny
        .from('quotes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
}
