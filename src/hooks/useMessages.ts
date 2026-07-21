import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCompanyId } from '@/lib/getCompanyId';
import { useCurrentCompany } from '@/hooks/useCompany';

export type Message = {
  id: string;
  company_id: string;
  lead_id: string | null;
  content: string;
  direction: string;
  status: string | null;
  created_at: string;
  updated_at: string;
};

export type MessageInsert = Omit<Message, 'id' | 'created_at' | 'updated_at'>;
export type MessageUpdate = Partial<MessageInsert>;

export type MessageWithLead = Message & {
  leads: { name: string; phone: string } | null;
};

export function useMessages() {
  const { data: company } = useCurrentCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['messages', companyId],
    enabled: !!companyId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('messages')
        .select(`
          *,
          leads!messages_lead_id_fkey(name, phone)
        `)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as MessageWithLead[];
    },
  });
}

export function useCreateMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: MessageInsert) => {
      const company_id = await getCompanyId();
      if (!company_id) throw new Error('No company found');
      
      const { data, error } = await (supabase as any)
        .from('messages')
        .insert({ ...message, company_id })
        .select()
        .single();
      
      if (error) throw error;
      return data as Message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

export function useUpdateMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: MessageUpdate & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('messages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}
