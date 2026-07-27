# Safety Audit — Will the Fixes Break Anything?

## TL;DR: Safe to Apply with One Important Distinction

The fixes are **safe**, provided we correctly separate **two types** of `getUser()` calls:

| Type | Where | Safe to switch to `getSession()`? |
|------|--------|----------------------------------|
| **Data fetching** — just needs the user ID to query the DB | query functions in hooks | ✅ YES — RLS on the DB protects data server-side |
| **Write/mutation** — creating records with `created_by: user.id` | mutation functions | ✅ YES — session user.id is the same as getUser user.id |
| **Security gate** — checking if user is allowed to do something before an action | `assertCanModifyInteraction`, auth checks | ⚠️ KEEP `getUser()` for extra safety |
| **Payment prefill only** — just populating `email` in Razorpay UI | `useRenewalPayment`, `useSeatPurchase`, `RechargeDialog`, `UpgradeDialog` | ✅ YES — no security consequence, just UI prefill |

---

## Call-by-Call Audit

### ✅ `getCompanyId.ts` — SAFE to switch + cache
- Only fetches `company_id` from profile table
- **RLS on the DB** prevents wrong-company data access regardless
- **Cache is safe** because `clearCompanyIdCache()` is already called by `useAuth` on `SIGNED_OUT` and `SIGNED_IN` events
- The `useTeamChat.clearCompanyIdCache()` is currently a no-op anyway — we just need to wire it to the real cache clear

---

### ✅ `useCompany.ts` — `useCurrentCompany()` (line 79) — SAFE
- Just reads the user's `company_id` from profile, then fetches company data
- No security implication — data is RLS-protected server-side
- Already has `staleTime: 5 * 60_000`, so it won't re-run constantly

---

### ✅ `useProfiles.ts` — `useCurrentProfile()` (line 63) — SAFE
- Fetches the current user's own profile
- RLS already restricts what the user can see

---

### ✅ `useTasks.ts` (line 49) — SAFE
- `user.id` is only used to categorize tasks as `assigned_to === user.id` for display filtering
- No DB write, no security gate

---

### ✅ `useTeamChat.ts` — `useSendChatMessage()` (line 96) — SAFE
- `user.id` sets the `sender_id` field in the insert
- The JWT in the request is validated by Supabase RLS server-side regardless
- `getSession()` returns the same user ID

---

### ✅ `useEmployees.ts` — `useCreateEmployee()` (line 84) — SAFE
- `user.id` is stored as `created_by` — an audit field, not a security gate
- The Supabase insert will only succeed if RLS allows it (JWT verified server-side)

---

### ✅ `useEmployeeAttendance.ts` — `useMarkAttendance()` + `useBulkMarkAttendance()` (lines 168, 230) — SAFE
- `user.id` stored as `created_by` — same situation as above

---

### ✅ `logTeamActivity.ts` (line 22) — SAFE
- Just records who performed an action — fire-and-forget audit log
- Not a security gate; already has try/catch and ignores errors

---

### ✅ `useCallAnalytics.ts` — `getUserContext()` (line 110) — SAFE
- Fetches userId, companyId, and role for **display/filtering**, not access control
- This also calls `getCompanyId()` immediately after — double `getUser()` call that becomes 0 network calls with the cache fix

---

### ✅ `useSupport.ts` — `getAuthContext()` (line 28) — SAFE
- Used to build context for ticket fetching/display (role checks, industry filter)
- Not an access control gate — RLS handles that

---

### ✅ Payment flows — `useRenewalPayment`, `useSeatPurchase`, `RechargeDialog`, `UpgradeDialog` — SAFE
- `user.email` is **only used to pre-fill the email field in Razorpay's checkout UI**
- No security consequence if this comes from session vs. fresh getUser
- If `user` is null from session, the prefill just shows blank (Razorpay allows this)

---

### ⚠️ `useLeadHistory.ts` — `assertCanModifyInteraction()` (line 14) — KEEP `getUser()`
- This function checks whether the current user is **allowed to edit/delete** another user's note
- It verifies ownership (`created_by === profile.id`) and role
- **This is a real authorization check** — keep `getUser()` here for extra safety

---

### ⚠️ `useLeadHistory.ts` — `insertLeadReassignmentAuditEntry()` (line 59) — borderline
- Creates an audit log entry — very similar to `logTeamActivity`
- Could use `getSession()`, but since it's called from mutation context (already past auth), it's low-risk either way
- **Recommendation**: Keep `getUser()` here since it's a write path and called infrequently

---

### ⚠️ `useLeadHistory.ts` — `useAddLeadInteraction()` mutation (line 129) — SAFE to switch
- `user.id` used to fetch the actor's profile, then stored as `created_by`
- Same pattern as `useEmployees` / `useTeamChat`

---

### ✅ `BillingView.tsx` — local `getCompanyId()` copy (lines 48–59) — SAFE + can be deleted
- This is a **duplicate copy** of the same function from `@/lib/getCompanyId.ts` 
- Should be deleted and replaced with the import — this is a bug as it won't benefit from the cache

---

## Supabase RLS — Why `getSession()` is Safe for Data Queries

When you call `supabase.from('table').select(...)`, the Supabase JS client automatically attaches the **session JWT** from localStorage to every request header. Supabase's PostgREST then validates that JWT server-side on every query. This means:

> Even if the client-side code uses a slightly "older" cached session, the **server always validates the JWT independently**. Any RLS policies (like "user can only see their own company's data") are enforced at the database level.

`getUser()` adds an extra network round-trip to **re-verify** the JWT with Supabase Auth, which is only necessary for **critical security decisions that happen purely client-side** (like showing admin UI, which you already guard with RLS).

---

## Summary of What Changes vs. What Stays

| What changes | Risk |
|---|---|
| `getCompanyId.ts` → uses `getSession()` + memory cache | ✅ None |
| `useCompany.ts`, `useProfiles.ts` → `getSession()` | ✅ None |
| `useTasks.ts`, `useTeamChat.ts`, `useEmployees.ts`, `useEmployeeAttendance.ts` → `getSession()` | ✅ None |
| `logTeamActivity.ts`, `useCallAnalytics.ts`, `useSupport.ts` → `getSession()` | ✅ None |
| Payment dialogs → `getSession()` for email prefill | ✅ None |
| `BillingView.tsx` local copy → import from `getCompanyId` | ✅ None (bug fix) |
| **`assertCanModifyInteraction()`** | ⛔ Keep `getUser()` |
| `useAuth.ts` sign-in security checks | ⛔ Keep `getUser()` |

---

## One Side-effect to Know

After the cache fix, **`clearCompanyIdCache()`** in `useTeamChat.ts` is currently a no-op stub. We need to update it to actually call the real cache clear function from `getCompanyId.ts`. This is already wired into `useAuth`'s sign-out and sign-in flows — so user-switching/logout will still clear the cache correctly.

**No existing features will break. The only behavioral change is fewer network requests.**
