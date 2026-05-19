import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { insertLeadReassignmentAuditEntry } from '@/hooks/useLeadHistory';
import { logTeamActivity } from '@/lib/logTeamActivity';

export type Lead = Tables<'leads'>;
export type LeadInsert = Omit<TablesInsert<'leads'>, 'company_id'>;
export type LeadUpdate = TablesUpdate<'leads'>;

async function getUserCompanyId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).maybeSingle();
  return data?.company_id || null;
}

export function useLeads() {
  return useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const company_id = await getUserCompanyId();
      if (!company_id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('company_id', company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Lead[];
    },
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: async () => {
      const company_id = await getUserCompanyId();
      if (!company_id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .eq('company_id', company_id)
        .maybeSingle();

      if (error) throw error;
      return data as Lead | null;
    },
    enabled: !!id,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lead: LeadInsert) => {
      const company_id = await getUserCompanyId();
      if (!company_id) throw new Error('No company found');
      
      const { data, error } = await supabase
        .from('leads')
        .insert({ ...lead, company_id })
        .select()
        .single();
      
      if (error) throw error;

      void logTeamActivity({
        action_type: 'lead_created',
        description: `Created new lead: ${data.name}`,
        reference_id: data.id,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['team-report'] });
      queryClient.invalidateQueries({ queryKey: ['team-member-detail'] });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: LeadUpdate & { id: string }) => {
      const { data: prior, error: priorError } = await supabase
        .from('leads')
        .select('assigned_to, company_id')
        .eq('id', id)
        .maybeSingle();

      if (priorError) throw priorError;

      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      if (
        updates.assigned_to !== undefined &&
        prior &&
        updates.assigned_to !== prior.assigned_to &&
        data.company_id
      ) {
        try {
          await insertLeadReassignmentAuditEntry({
            companyId: data.company_id,
            leadId: id,
            leadType: 'real_estate',
            newAssigneeUserId: updates.assigned_to ?? null,
          });
        } catch (e) {
          console.warn('Failed to log lead reassignment', e);
        }
      }

      void logTeamActivity({
        action_type: 'lead_updated',
        description: 'Updated lead record',
        reference_id: id,
      });

      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['team-report'] });
      queryClient.invalidateQueries({ queryKey: ['team-member-detail'] });
      if (variables.assigned_to !== undefined) {
        queryClient.invalidateQueries({ queryKey: ['lead-history', variables.id] });
      }
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useScoreLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/score-lead`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ leadId }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to score lead');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}
