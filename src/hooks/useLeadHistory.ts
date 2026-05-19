import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { logTeamActivity } from '@/lib/logTeamActivity';

export type LeadHistoryLeadType = 'real_estate' | 'automobile' | 'internal_crm';

export type LeadInteraction = Tables<'lead_interactions'>;

async function getUserCompanyId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).maybeSingle();
  return data?.company_id || null;
}

async function assertCanModifyInteraction(interactionId: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, company_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile?.id || !profile.company_id) throw new Error('No profile');

  const { data: row, error } = await supabase
    .from('lead_interactions')
    .select('lead_id, created_by')
    .eq('id', interactionId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) throw error;
  if (!row) throw new Error('Entry not found');

  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('company_id', profile.company_id)
    .maybeSingle();

  const role = roleRow?.role;
  const privileged = role === 'super_admin' || role === 'admin';
  const owner = row.created_by === profile.id;

  if (!owner && !privileged) {
    throw new Error('Not allowed to modify this entry');
  }

  return row.lead_id;
}

export async function insertLeadReassignmentAuditEntry(opts: {
  companyId: string;
  leadId: string;
  leadType: LeadHistoryLeadType;
  newAssigneeUserId: string | null;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: actorProfile } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!actorProfile?.id) return;

  let assigneeLabel = 'Unassigned';
  if (opts.newAssigneeUserId) {
    const { data: assignee } = await supabase
      .from('profiles')
      .select('name')
      .eq('user_id', opts.newAssigneeUserId)
      .maybeSingle();
    assigneeLabel = assignee?.name?.trim() || 'Team member';
  }

  const { error } = await supabase.from('lead_interactions').insert({
    company_id: opts.companyId,
    lead_id: opts.leadId,
    lead_type: opts.leadType,
    interaction_type: 'note',
    note: `Lead reassigned to ${assigneeLabel}`,
    created_by: actorProfile.id,
    created_by_name: actorProfile.name?.trim() || 'Unknown',
  } satisfies TablesInsert<'lead_interactions'>);

  if (error) throw error;
}

export function useLeadHistory(leadId: string, leadType: LeadHistoryLeadType) {
  return useQuery({
    queryKey: ['lead-history', leadId],
    queryFn: async () => {
      const company_id = await getUserCompanyId();
      if (!company_id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('lead_interactions')
        .select('*')
        .eq('lead_id', leadId)
        .eq('lead_type', leadType)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as LeadInteraction[];
    },
    enabled: typeof leadId === 'string' && leadId.length > 0,
  });
}

export function useAddLeadInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      leadId: string;
      leadType: LeadHistoryLeadType;
      interaction_type: string;
      note: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile?.id || !profile.company_id) throw new Error('No company profile');

      const insert: TablesInsert<'lead_interactions'> = {
        company_id: profile.company_id,
        lead_id: payload.leadId,
        lead_type: payload.leadType,
        interaction_type: payload.interaction_type,
        note: payload.note.trim(),
        created_by: profile.id,
        created_by_name: profile.name?.trim() || 'Unknown',
      };

      const { data, error } = await supabase
        .from('lead_interactions')
        .insert(insert)
        .select()
        .single();

      if (error) throw error;

      void logTeamActivity({
        action_type: 'note_added',
        description: 'Added interaction note to lead',
        reference_id: data.id,
      });

      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-history', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['team-report'] });
      queryClient.invalidateQueries({ queryKey: ['team-member-detail'] });
    },
  });
}

export function useUpdateLeadInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: string; note: string; leadId: string }) => {
      await assertCanModifyInteraction(payload.id);

      const { data, error } = await supabase
        .from('lead_interactions')
        .update({ note: payload.note.trim() })
        .eq('id', payload.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-history', variables.leadId] });
    },
  });
}

export function useSoftDeleteLeadInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: string; leadId: string }) => {
      await assertCanModifyInteraction(payload.id);

      const { data, error } = await supabase
        .from('lead_interactions')
        .update({ is_deleted: true })
        .eq('id', payload.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-history', variables.leadId] });
    },
  });
}

export function useLeadHistoryRealtime(leadId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!leadId) return;

    const channel = supabase
      .channel(`lead-history-${leadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lead_interactions',
          filter: `lead_id=eq.${leadId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['lead-history', leadId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, leadId]);
}
