import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';
import { InternalLead } from './useInternalLeads';

// Cast supabase to any to bypass type checking for custom internal crm tables
const supabaseAny = supabase as any;

export type DemoStatus = 'scheduled' | 'completed' | 'cancelled';

export type InternalDemo = {
    id: string;
    lead_id: string;
    company_id: string;
    demo_date: string;
    demo_time: string;
    status: DemoStatus;
    notes: string | null;
    created_at: string;
    updated_at: string;
    internal_leads?: InternalLead;
};

export type InternalDemoInsert = Omit<InternalDemo, 'id' | 'created_at' | 'updated_at' | 'company_id' | 'internal_leads'>;
export type InternalDemoUpdate = Partial<InternalDemoInsert>;

export function useInternalDemos() {
    const { data: company } = useCurrentCompany();

    return useQuery({
        queryKey: ['internal_demos', company?.id],
        queryFn: async () => {
            if (!company?.id) return [];

            const { data, error } = await supabaseAny
                .from('internal_crm_demos')
                .select(`
          *,
          internal_leads (
            id,
            lead_name,
            company_name,
            phone_no,
            industry,
            stage
          )
        `)
                .eq('company_id', company.id)
                .order('demo_date', { ascending: false })
                .order('demo_time', { ascending: false });

            if (error) {
                console.error('Error fetching internal demos:', error);
                return []; // Return empty array if table doesn't exist yet
            }
            return data as InternalDemo[];
        },
        enabled: !!company?.id,
    });
}

export function useCreateInternalDemo() {
    const queryClient = useQueryClient();
    const { data: company } = useCurrentCompany();

    return useMutation({
        mutationFn: async (demo: InternalDemoInsert) => {
            if (!company?.id) throw new Error('No company found');

            const { data, error } = await supabaseAny
                .from('internal_crm_demos')
                .insert({
                    ...demo,
                    company_id: company.id,
                })
                .select()
                .single();

            if (error) throw error;
            return data as InternalDemo;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['internal_demos'] });
            queryClient.invalidateQueries({ queryKey: ['internalLeads'] });
        },
    });
}

export function useUpdateInternalDemo() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: InternalDemoUpdate & { id: string }) => {
            const { data, error } = await supabaseAny
                .from('internal_crm_demos')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data as InternalDemo;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['internal_demos'] });
            queryClient.invalidateQueries({ queryKey: ['internalLeads'] });
        },
    });
}

export function useDeleteInternalDemo() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabaseAny
                .from('internal_crm_demos')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['internal_demos'] });
            queryClient.invalidateQueries({ queryKey: ['internalLeads'] });
        },
    });
}
