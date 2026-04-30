# 224 - P2-S3 (JWT role authority / legacy `is_admin` rollout) - Plan

Date: 2026-04-30  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (P2-S3)

## Why this patch exists

`role` is already the canonical authorization source (`requireAdmin` checks
`role === 'system_admin'`), but JWT payloads still include legacy `is_admin`.
That invites future misuse and keeps two authority signals in active tokens.

The audit action for S3 is:
- stop emitting `is_admin` in newly issued tokens,
- keep one-rollover compatibility for old tokens that still carry it,
- reinforce that runtime authorization is role/permission-driven.

## Scope

### In scope

1. Update token generation so new JWTs do not include `is_admin`.
2. Keep token verification backward compatible with already-issued tokens.
3. Update auth route token issuance call sites to the new payload contract.
4. Cover behavior with targeted auth tests (refresh/rotation compatibility).
5. Add implementation patch note with verification outcome.

### Out of scope

- Removing `is_admin` from database schema or user API payloads.
- Full cleanup of all `is_admin` references in business/user-management logic.
- Auth-cookie migration work (separate security item).

## Design choices

1. **Compatibility-first rollout**
   - New tokens omit `is_admin`.
   - Middleware derives `req.user.is_admin` from token `role` when claim is absent.
   - Legacy tokens with `is_admin` remain valid until they naturally rotate out.

2. **Single enforcement point**
   - Strip legacy `is_admin` centrally in `generateToken(...)`.
   - This avoids relying on every call site to remember omission.

3. **No auth-contract break for existing code**
   - Keep `req.user.is_admin` available as a computed boolean for now.
   - Existing route code can continue functioning while authority remains `role`.

## Strategy

### Step 1 - Middleware token contract hardening

Files:
- `MuseBar/backend/src/middleware/auth.ts`

Plan:
1. Make JWT payload `is_admin` optional at verification time.
2. Ensure `generateToken(...)` drops `is_admin` before signing.
3. In `requireAuth`, derive `req.user.is_admin` from:
   - explicit token claim when present (legacy token),
   - otherwise `payload.role === 'system_admin'`.

### Step 2 - Auth token issuer updates

Files:
- `MuseBar/backend/src/routes/authLogin.ts`
- `MuseBar/backend/src/services/establishmentAccountCreation/database/UserAccountOperations.ts`

Plan:
1. Remove `is_admin` from token payload objects passed to token signers.
2. Keep user response payloads unchanged where clients still expect `is_admin`.
3. Ensure non-login token issuance paths still include role context.

### Step 3 - Regression tests

Files:
- `MuseBar/backend/src/routes/authLogin.refreshRotation.test.ts`
- (if needed) other auth route tests touching token decode assumptions.

Plan:
1. Assert refreshed tokens no longer expose `is_admin`.
2. Add a compatibility case showing legacy tokens with `is_admin` still refresh.

### Step 4 - Verify

Run:
- targeted auth tests for changed flows,
- backend type-check (if required by touched types),
- lints on touched files.

## Acceptance criteria

1. Newly issued JWTs do not include `is_admin`.
2. Legacy tokens with `is_admin` continue to pass auth during rollout.
3. `requireAdmin` and permission checks remain role/permission authoritative.
4. Targeted auth tests pass with the new behavior.
