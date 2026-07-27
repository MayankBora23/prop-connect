import { supabase } from '@/integrations/supabase/client';

// In-memory cache — avoids repeated network getUser() + profile DB calls
let _cachedCompanyId: string | null | undefined = undefined;
let _cacheForUserId: string | null = null;

/** Call this on sign-in and sign-out to bust the cache. */
export function clearCompanyIdCache(): void {
  _cachedCompanyId = undefined;
  _cacheForUserId = null;
}

export async function getCompanyId(): Promise<string | null> {
  // getSession() reads from localStorage — no network round-trip
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  // Return cached value if same user
  if (_cacheForUserId === user.id && _cachedCompanyId !== undefined) {
    return _cachedCompanyId;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle();

  _cachedCompanyId = profile?.company_id ?? null;
  _cacheForUserId = user.id;
  return _cachedCompanyId;
}
