import { normalizeCallerDeskBridgeNumber } from '@/lib/callerdeskPhone';
import type { TelephonySettingsSnapshot } from '@/hooks/useTelephonySettings';

export function isCallerDeskCompanyReady(settings?: TelephonySettingsSnapshot | null): boolean {
  if (!settings) return false;
  const virtual = (settings.callerdesk_virtual_number || '').replace(/\D/g, '');
  return Boolean(settings.callerdesk_integration_key && virtual);
}

export function isCallerDeskUserReady(
  settings?: TelephonySettingsSnapshot | null,
  profileBridgeNumber?: string | null
): boolean {
  return isCallerDeskCompanyReady(settings) && !!normalizeCallerDeskBridgeNumber(profileBridgeNumber);
}
