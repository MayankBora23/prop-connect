import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Barcode = Tables<'barcodes'>;
export type BarcodeInsert = TablesInsert<'barcodes'>;
export type BarcodeUpdate = TablesUpdate<'barcodes'>;

export function useBarcodes() {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['barcodes', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('barcodes')
        .select(`
          *,
          products (
            id,
            name,
            sku
          )
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });
}

export function useBarcode(id: string) {
  return useQuery({
    queryKey: ['barcode', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barcodes')
        .select(`
          *,
          products (
            id,
            name,
            sku,
            description
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function useProductBarcodes(productId: string) {
  return useQuery({
    queryKey: ['product_barcodes', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barcodes')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateBarcode() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (barcode: BarcodeInsert) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('barcodes')
        .insert({
          ...barcode,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Barcode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barcodes'] });
    },
  });
}

export function useUpdateBarcode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: BarcodeUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('barcodes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Barcode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barcodes'] });
    },
  });
}

export function useDeleteBarcode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('barcodes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barcodes'] });
    },
  });
}
