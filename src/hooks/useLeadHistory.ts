import { useCallback, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database, Json, Tables } from '@/integrations/supabase/types';

export type LeadEntity = Database['public']['Enums']['lead_entity'];

export type LeadHistoryRow = Tables<'lead_history'> & {
  profiles?: { name: string | null; user_id: string } | null;
};

type InsertPayload = {
  lead_id: string;
  lead_entity: LeadEntity;
  company_id: string;
  interaction_type: string;
  message: string;
  raw_data?: Json;
  visibility?: 'team' | 'private';
};

function historyQueryKey(leadEntity: LeadEntity, leadId: string, companyId: string) {
  return ['leadHistory', leadEntity, leadId, companyId] as const;
}

/** PostgREST embeds on `profiles` often return 400 if FK hint/schema drift; load names separately. */
async function enrichLeadHistoryWithProfiles(
  rows: Tables<'lead_history'>[]
): Promise<LeadHistoryRow[]> {
  if (!rows.length) return [];

  const ids = [...new Set(rows.map((r) => r.created_by))];
  const { data: profs, error: profErr } = await supabase
    .from('profiles')
    .select('user_id, name')
    .in('user_id', ids);

  if (profErr) {
    return rows.map((r) => ({
      ...r,
      profiles: { user_id: r.created_by, name: null },
    }));
  }

  const nameByUser = new Map((profs ?? []).map((p) => [p.user_id, p.name as string | null]));

  return rows.map((r) => ({
    ...r,
    profiles: {
      user_id: r.created_by,
      name: nameByUser.get(r.created_by) ?? null,
    },
  }));
}

async function fetchLeadHistory(
  leadEntity: LeadEntity,
  leadId: string,
  companyId: string
): Promise<LeadHistoryRow[]> {
  const { data, error } = await supabase
    .from('lead_history')
    .select('*')
    .eq('lead_entity', leadEntity)
    .eq('lead_id', leadId)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return enrichLeadHistoryWithProfiles((data ?? []) as Tables<'lead_history'>[]);
}

export function useLeadHistory({
  leadId,
  leadEntity,
  companyId,
  enabled,
}: {
  leadId: string;
  leadEntity: LeadEntity;
  companyId: string;
  enabled: boolean;
}) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => historyQueryKey(leadEntity, leadId, companyId),
    [leadEntity, leadId, companyId]
  );

  const query = useQuery({
    queryKey,
    queryFn: () => fetchLeadHistory(leadEntity, leadId, companyId),
    enabled: enabled && !!leadId && !!companyId,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  useEffect(() => {
    if (!enabled || !leadId || !companyId) return;

    const channel = supabase
      .channel(`lead-history:${leadEntity}:${leadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_history',
          filter: `lead_id=eq.${leadId}`,
        },
        () => {
          invalidate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, leadId, leadEntity, companyId, invalidate]);

  const addEntry = useMutation({
    mutationFn: async (payload: InsertPayload) => {
      const { data, error } = await supabase
        .from('lead_history')
        .insert({
          lead_id: payload.lead_id,
          lead_entity: payload.lead_entity,
          company_id: payload.company_id,
          interaction_type: payload.interaction_type.trim(),
          message: payload.message.trim(),
          raw_data: payload.raw_data ?? {},
          visibility: payload.visibility ?? 'team',
        })
        .select('*')
        .single();

      if (error) throw error;
      const [enriched] = await enrichLeadHistoryWithProfiles([data as Tables<'lead_history'>]);
      return enriched;
    },
    onSuccess: () => {
      invalidate();
    },
  });

  return {
    ...query,
    entries: query.data ?? [],
    addEntry,
    invalidate,
  };
}
