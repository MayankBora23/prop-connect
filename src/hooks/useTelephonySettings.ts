import { useEffect } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentProfile } from './useProfiles';
import { normalizeCallerDeskIntegrationInput } from '@/lib/callerdeskAuthCode';
import type { TelephonyProviderKey } from './useTelephony';

export type TelephonySettingsSnapshot = {
  telephony_provider: TelephonyProviderKey;
  callerdesk_virtual_number: string | null;
  callerdesk_integration_key: string | null;
  /** Company-level CallerDesk keys (integration + virtual). Bridge number is per-user on profiles. */
  isCallerDeskCompanyReady: boolean;
};

export function telephonySettingsQueryKey(companyId: string | undefined) {
  return ['telephony-settings', companyId] as const;
}

function parseTelephonySettings(data: Record<string, unknown> | null): TelephonySettingsSnapshot {
  const telephony_provider: TelephonyProviderKey =
    data?.telephony_provider === 'callerdesk' ? 'callerdesk' : 'twilio';

  const integrationKey = normalizeCallerDeskIntegrationInput(
    ((data?.callerdesk_integration_key as string) || '').toString()
  );
  const virtualRaw = ((data?.callerdesk_virtual_number as string) || '').toString().trim();

  return {
    telephony_provider,
    callerdesk_virtual_number: virtualRaw || null,
    callerdesk_integration_key: integrationKey || null,
    isCallerDeskCompanyReady: !!integrationKey && !!virtualRaw.replace(/\D/g, ''),
  };
}

async function fetchTelephonySettings(companyId: string): Promise<TelephonySettingsSnapshot> {
  const { data, error } = await (supabase as any)
    .from('whatsapp_settings')
    .select('telephony_provider, callerdesk_virtual_number, callerdesk_integration_key')
    .eq('company_id', companyId)
    .maybeSingle();

  if (error) throw error;
  return parseTelephonySettings(data as Record<string, unknown> | null);
}

export function invalidateTelephonyDataQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['call-analytics'] });
  queryClient.invalidateQueries({ queryKey: ['call-logs'] });
}

/** Optimistic update when Telephony Provider dropdown changes — instant UI sync. */
export function applyOptimisticTelephonyProvider(
  queryClient: QueryClient,
  companyId: string,
  provider: TelephonyProviderKey
) {
  queryClient.setQueryData<TelephonySettingsSnapshot>(
    telephonySettingsQueryKey(companyId),
    (old) => ({
      telephony_provider: provider,
      callerdesk_virtual_number: old?.callerdesk_virtual_number ?? null,
      callerdesk_integration_key: old?.callerdesk_integration_key ?? null,
      isCallerDeskCompanyReady: old?.isCallerDeskCompanyReady ?? false,
    })
  );
  invalidateTelephonyDataQueries(queryClient);
}

export function useTelephonySettings() {
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const companyId = profile?.company_id;

  const query = useQuery({
    queryKey: telephonySettingsQueryKey(companyId),
    queryFn: () => fetchTelephonySettings(companyId!),
    enabled: !!companyId,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel(`telephony-settings-sync-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_settings',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: telephonySettingsQueryKey(companyId) });
          invalidateTelephonyDataQueries(queryClient);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, queryClient]);

  return query;
}
