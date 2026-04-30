# 194 - P1-S2 (Optional Kick Prior Sessions on Login) - Plan

Date: 2026-04-30  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (P1-S2)

## Why this patch exists

P1-S2 asks for an optional "kick prior sessions" mode on login.
Current auth supports per-token revocation and refresh rotation, but not a simple
way to invalidate all older tokens for a user at next login.

## Beginner-friendly framing

When a user logs in and asks for "disconnect my other sessions":

- old tokens (phone, another browser, stale cashier session) should stop working,
- new login token should keep working.

We need this to be optional, not forced globally.

## Scope

### In scope

1. Add optional login flag `kickPriorSessions`.
2. Add user-level token cutoff storage (issued-at threshold).
3. Enforce cutoff in auth token revocation checks.
4. Add regression tests for login flag behavior.
5. Document implementation and verification.

### Out of scope

- Admin UI for session management.
- Per-device/session list display.

## Design choices

1. **IAT cutoff model (simple and deterministic)**
   - Store `revoke_before_iat` per user.
   - Any token with `iat < revoke_before_iat` is treated as revoked.

2. **Optional by request flag**
   - Default behavior unchanged.
   - Only applied when `kickPriorSessions: true` is passed to `/api/auth/login`.

3. **Keep existing blocklist**
   - Token hash blocklist remains for single-token revoke/rotation.
   - Cutoff adds a coarse "revoke all older tokens" layer.

## Strategy

### Step 1 - Persistence

Add migration for `user_token_revocation_cutoffs` table:
- `user_id` (PK, FK users),
- `revoke_before_iat` (BIGINT),
- `reason`,
- `updated_at`.

### Step 2 - Model updates

File:
- `MuseBar/backend/src/models/tokenBlocklist.ts`

Add:
- `revokeAllUserTokensIssuedBefore(...)`,
- cutoff-aware check inside `isTokenRevoked(...)`.

### Step 3 - Login route hook

File:
- `MuseBar/backend/src/routes/authLogin.ts`

On successful credentials, if `kickPriorSessions: true`:
- compute cutoff iat,
- persist cutoff before minting new token.

### Step 4 - Tests

File:
- `MuseBar/backend/src/routes/authLogin.loginSessionKick.test.ts` (new)

Cover:
- no cutoff call by default,
- cutoff call when flag is true.

### Step 5 - Verification

Run:
- new login kick test + auth route regression tests,
- backend type-check + lint diagnostics.

## Acceptance criteria

1. Login supports optional prior-session invalidation.
2. Tokens older than stored cutoff are rejected by auth middleware checks.
3. Existing login/refresh/logout flows remain intact.
