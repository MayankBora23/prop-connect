# Excessive API Calls — Root Cause Analysis & Fix Plan

## 🔍 Summary of Issues Found

Your app is making **far too many redundant network calls** to Supabase on every page load, especially the `/auth/v1/user` endpoint (i.e. `supabase.auth.getUser()`). This causes sections to hang on loading because they're each waiting on their own independent auth/profile waterfall.

---

## Problem 1: `getUser()` Called Everywhere (No Centralization)

`supabase.auth.getUser()` hits the **network every single call** (it verifies the JWT with Supabase server). It's currently called from **23+ different places**:

| File | Calls |
|------|-------|
| `useCompany.ts` | 1 |
| `useProfiles.ts` | 1 |
| `useCallAnalytics.ts` | 1 |
| `useEmployeeAttendance.ts` | 2 |
| `useEmployees.ts` | 1 |
| `useLeadHistory.ts` | 3 |
| `useSupport.ts` | 1 |
| `useTasks.ts` | 1 |
| `useTeamChat.ts` | 1 |
| `useWhatsApp.ts` | 3 |
| `logTeamActivity.ts` | 1 |
| `getCompanyId.ts` | 1 (but called from 20+ other files!) |
| `BillingView.tsx` | 1 |
| `RechargeDialog.tsx` | 1 |
| `TelephonyBillingCard.tsx` | 1 |
| `UpgradeDialog.tsx` | 1 |

### Why `getCompanyId()` is the worst offender

`getCompanyId()` calls `supabase.auth.getUser()` + a `profiles` DB query every time it runs. It's called from **20+ hooks** including:
- `useWallet.ts` (7 times per session!)
- `useWhatsAppTemplates.ts` (7 times per session)
- `useSubscription.ts` (4 times)
- `useTeamChat.ts` (3 times)
- `useProperties.ts`, `useLeads.ts`, `useSiteVisits.ts`, etc.

**On a typical dashboard load, this triggers 20–40 sequential network calls just to get the company ID.**

---

## Problem 2: Double Auth in `useCurrentCompany`

`useCurrentCompany` in `useCompany.ts` (line 79) calls `supabase.auth.getUser()` AND then queries `profiles` for `company_id` — this is the same waterfall as `getCompanyId()` but done separately.

Meanwhile many hooks ALSO call `getCompanyId()` independently, so you get:
- `useCurrentCompany` → getUser → profiles query
- `useProfiles` (team-members) → `getCompanyId()` → **another** getUser → **another** profiles query
- Every mutation hook → **another** `getCompanyId()` call chain

---

## Problem 3: `useAuth()` Used in 3 Places in `App.tsx`

In `App.tsx`, `useAuth()` is called in `AppContent`, `ProtectedRoute`, and `AuthRoute` — **three separate hook instances** with no shared state. Each creates its own listener and session check.

---

## ✅ Fix Plan

### Fix 1: Replace `getUser()` with a cached session getter

Use `supabase.auth.getSession()` (local, no network) instead of `getUser()` for reading the user ID inside query functions. `getUser()` should only be used for sensitive security checks.

```ts
// ✅ FAST — reads from memory/localStorage
const { data: { session } } = await supabase.auth.getSession();
const user = session?.user;

// ❌ SLOW — hits network every time
const { data: { user } } = await supabase.auth.getUser();
```

> [!IMPORTANT]
> `getSession()` is safe for client-side data fetching. Row-level security in Supabase validates the JWT server-side anyway. `getUser()` is only needed for security-critical paths (login gating, payment flows).

---

### Fix 2: Cache the company ID in memory

Update `getCompanyId.ts` to use an in-memory cache so it only calls the DB once per session:

```ts
// src/lib/getCompanyId.ts
import { supabase } from '@/integrations/supabase/client';

let _cachedCompanyId: string | null | undefined = undefined;
let _cacheForUserId: string | null = null;

export function clearCompanyIdCache() {
  _cachedCompanyId = undefined;
  _cacheForUserId = null;
}

export async function getCompanyId(): Promise<string | null> {
  // Use getSession() — local, no network
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  // If same user and already cached, return immediately
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
```

---

### Fix 3: Replace `getUser()` with `getSession()` in all query functions

In every hook's `queryFn`, replace:
```ts
const { data: { user } } = await supabase.auth.getUser();
```
with:
```ts
const { data: { session } } = await supabase.auth.getSession();
const user = session?.user;
```

Files to update: `useCompany.ts`, `useProfiles.ts`, `useCallAnalytics.ts`, `useEmployeeAttendance.ts`, `useEmployees.ts`, `useLeadHistory.ts`, `useSupport.ts`, `useTasks.ts`, `useTeamChat.ts`, `useWhatsApp.ts`, `logTeamActivity.ts`, all component files.

---

### Fix 4: Create a shared `useCurrentUser` hook (React context)

Instead of each hook calling auth independently, expose the user from a React context so all hooks share the same resolved user:

```ts
// src/hooks/useCurrentUser.ts
import { useAuth } from './useAuth';
export function useCurrentUser() {
  const { user, session } = useAuth();
  return { user, session };
}
```

Then pass `userId`/`companyId` as query key params and `enabled` guards so queries don't even start until auth is ready.

---

### Fix 5: Use React Query `enabled` properly

Many hooks don't gate their queries on whether the user/companyId is available yet. Add:
```ts
enabled: !!companyId,  // already done in some hooks but not all
```

This prevents the "loading forever" state — if `companyId` is undefined, the query never fires and hangs.

---

### Fix 6: Consolidate `useAuth()` usage in `App.tsx`

Move `useAuth()` into a React Context so `AppContent`, `ProtectedRoute`, and `AuthRoute` all share **one instance**:

```tsx
// Wrap everything in an AuthProvider that calls useAuth() once
const AuthContext = createContext<ReturnType<typeof useAuth> | null>(null);
```

---

## 📊 Expected Improvement

| Scenario | Before | After |
|----------|--------|-------|
| Dashboard cold load | ~25–40 `getUser` network calls | 1 `getSession` (local) + 1 profile query |
| Section tab switch | Repeats auth waterfall | Instant (cached) |
| Mutation (create lead etc.) | `getCompanyId` → getUser + profile query | Returns from memory cache |

---

## Priority Order

1. **High Impact, Low Risk**: Fix `getCompanyId.ts` to use `getSession` + in-memory cache → fixes 20+ call sites instantly
2. **High Impact, Low Risk**: Replace all `getUser()` in `queryFn`s with `getSession()`
3. **Medium**: Wrap `useAuth()` in context in `App.tsx`
4. **Low**: Add `enabled` guards to all hooks missing them
