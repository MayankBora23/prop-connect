import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

/** Keys must match DB CHECK on source_configs.source_name and party-lead-webhook ?source= */
export const THIRD_PARTY_PORTALS = [
  { source_name: '99acres' as const, label: '99acres' },
  { source_name: 'magicbricks' as const, label: 'Magicbricks' },
  { source_name: 'housing' as const, label: 'Housing.com' },
  { source_name: 'justdial' as const, label: 'Justdial' },
  { source_name: 'squareyards' as const, label: 'SquareYards' },
  { source_name: 'quikrhomes' as const, label: 'QuikrHomes' },
] as const;

export type ThirdPartySourceName = (typeof THIRD_PARTY_PORTALS)[number]['source_name'];

export type SourceConfigRow = Tables<'source_configs'>;

function buildLeadWebhookBaseUrl(): string {
  const projectUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') || '';
  if (!projectUrl) return '';
  try {
    const url = new URL(projectUrl);
    return `https://${url.host}/functions/v1/party-lead-webhook`;
  } catch {
    return '';
  }
}

export function portalWebhookUrl(webhookToken: string, sourceName: ThirdPartySourceName): string {
  const base = buildLeadWebhookBaseUrl();
  if (!base || !webhookToken) return '';
  const u = new URL(base);
  u.searchParams.set('token', webhookToken);
  u.searchParams.set('source', sourceName);
  return u.toString();
}

export function useSourceConfigs(companyId: string | undefined) {
  return useQuery({
    queryKey: ['sourceConfigs', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('source_configs')
        .select('*')
        .eq('company_id', companyId as string)
        .order('source_name');

      if (error) throw error;
      return (data ?? []) as SourceConfigRow[];
    },
  });
}

export function useUpsertSourceConfigActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      companyId,
      source_name,
      is_active,
      existingWebhookToken,
    }: {
      companyId: string;
      source_name: ThirdPartySourceName;
      is_active: boolean;
      existingWebhookToken: string | null | undefined;
    }) => {
      let webhook_token = existingWebhookToken ?? null;
      if (is_active && !webhook_token?.trim()) {
        const newToken = crypto.randomUUID();
        const { error: companyErr } = await supabase
          .from('companies')
          .update({ webhook_token: newToken })
          .eq('id', companyId);
        if (companyErr) throw companyErr;
        webhook_token = newToken;
      }

      const row: TablesInsert<'source_configs'> = {
        company_id: companyId,
        source_name,
        is_active,
        method: 'webhook',
        webhook_config: {},
      };

      const { data, error } = await supabase
        .from('source_configs')
        .upsert(row, { onConflict: 'company_id,source_name' })
        .select('*')
        .single();

      if (error) throw error;
      return { row: data as SourceConfigRow, webhook_token };
    },
    onSuccess: async (_data, vars) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sourceConfigs', vars.companyId] }),
        queryClient.refetchQueries({ queryKey: ['currentCompany'] }),
      ]);
    },
  });
}
