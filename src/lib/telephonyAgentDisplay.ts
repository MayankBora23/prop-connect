import type { CallLogRow } from '@/hooks/useCallAnalytics';

export type ProfileTelephonyMeta = {
  name: string;
  agent_identity: string | null;
};

export function buildProfilesTelephonyMeta(
  profiles: { user_id: string; name: string | null; agent_identity?: string | null }[]
): Record<string, ProfileTelephonyMeta> {
  const map: Record<string, ProfileTelephonyMeta> = {};
  for (const p of profiles) {
    if (p.user_id) {
      map[p.user_id] = {
        name: p.name || 'Unknown',
        agent_identity: p.agent_identity ?? null,
      };
    }
  }
  return map;
}

/** CRM user who placed / owns the call (profiles.user_id → name). */
export function getCrmAgentName(
  log: CallLogRow,
  profilesByUserId: Record<string, string>
): string {
  if (!log.agent_id) return '—';
  return profilesByUserId[log.agent_id] || '—';
}

/**
 * CallerDesk: bridge / agent mobile from Profile Settings (profiles.callerdesk_bridge_number on call_logs).
 * Not the same as profiles.agent_identity (Twilio SDK client name).
 */
export function getCallerDeskBridgeNumber(log: CallLogRow): string {
  return (
    log.agent_number ||
    log.callerdesk_bridge_number ||
    '—'
  );
}

/**
 * Twilio: per-user Agent Identity from Profile Settings (profiles.agent_identity).
 */
export function getTwilioAgentIdentity(
  log: CallLogRow,
  profilesMeta: Record<string, ProfileTelephonyMeta>
): string {
  if (log.agent_id && profilesMeta[log.agent_id]?.agent_identity) {
    return profilesMeta[log.agent_id].agent_identity!;
  }
  if (log.agent_number && log.agent_number.startsWith('agent_')) {
    return log.agent_number;
  }
  return '—';
}
