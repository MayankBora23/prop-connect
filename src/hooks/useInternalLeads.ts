import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Enums } from '@/integrations/supabase/types';
import { insertLeadReassignmentAuditEntry } from '@/hooks/useLeadHistory';
import { getCompanyId } from '@/lib/getCompanyId';
import { useCurrentCompany } from '@/hooks/useCompany';

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
  email: string | null;
  address: string | null;
  message: string | null;
  industry: Enums<'industry_type'> | null;
  user_limit: number | null;
  stage: InternalLeadStage;
  is_telephony_enabled: boolean | null;
  last_called_at: string | null;
  created_at: string;
  created_by: string;
};

export function useInternalLeads() {
  const { data: company } = useCurrentCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['internalLeads', companyId],
    enabled: !!companyId,
    staleTime: 60_000,
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
  email?: string;
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
          email: payload.email ?? null,
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
      const { data: priorRow, error: priorErr } = await (supabase as any)
        .from('internal_leads')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (priorErr) throw priorErr;

      const { data, error } = await (supabase as any)
        .from('internal_leads')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      const hadAssignKey = Object.prototype.hasOwnProperty.call(updates, 'assigned_to');
      if (
        hadAssignKey &&
        priorRow &&
        Object.prototype.hasOwnProperty.call(priorRow, 'assigned_to') &&
        (updates as { assigned_to?: string | null }).assigned_to !== priorRow.assigned_to
      ) {
        const companyId = await getCompanyId();
        if (companyId) {
          try {
            await insertLeadReassignmentAuditEntry({
              companyId,
              leadId: id,
              leadType: 'internal_crm',
              newAssigneeUserId: (updates as { assigned_to?: string | null }).assigned_to ?? null,
            });
          } catch (e) {
            console.warn('Failed to log internal lead reassignment', e);
          }
        }
      }

      return data as InternalLead;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['internalLeads'] });
      if (Object.prototype.hasOwnProperty.call(variables, 'assigned_to')) {
        queryClient.invalidateQueries({ queryKey: ['lead-history', variables.id] });
      }
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

