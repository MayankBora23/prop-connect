import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type OnlineCustomer = Tables<'online_customers'> & {
  customer_group?: 'regular' | 'premium' | 'vip' | null;
  total_orders?: number | null;
  total_spent?: number | null;
  last_order_date?: string | null;
};
export type OnlineCustomerInsert = {
  name: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  date_of_birth?: string;
  gender?: string;
  customer_group?: string;
  notes?: string;
  tags?: string[];
};
export type OnlineCustomerUpdate = TablesUpdate<'online_customers'>;

export function useOnlineCustomers() {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['online_customers', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('online_customers')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as any[] as OnlineCustomer[];
    },
    enabled: !!company?.id,
  });
}

export function useOnlineCustomer(id: string) {
  return useQuery({
    queryKey: ['online_customer', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('online_customers')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as OnlineCustomer | null;
    },
  });
}

export function useCreateOnlineCustomer() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (customer: OnlineCustomerInsert) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('online_customers')
        .insert({
          ...customer,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as OnlineCustomer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online_customers'] });
    },
  });
}

export function useUpdateOnlineCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: OnlineCustomerUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('online_customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as OnlineCustomer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online_customers'] });
    },
  });
}

export function useDeleteOnlineCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('online_customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online_customers'] });
    },
  });
}
