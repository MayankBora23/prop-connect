/** Normalize to digits only; CallerDesk agent bridge uses last 10 digits (no country code). */
export function normalizeCallerDeskBridgeNumber(value?: string | null): string {
  if (!value) return '';
  return value.toString().trim().replace(/^\+/, '').replace(/[^\d]/g, '').slice(-10);
}

export function bridgeNumbersMatch(stored?: string | null, candidate?: string | null): boolean {
  const a = normalizeCallerDeskBridgeNumber(stored);
  const b = normalizeCallerDeskBridgeNumber(candidate);
  if (!a || !b) return false;
  return a === b;
}
