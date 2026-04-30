# 195 - P1-S2 (Optional Kick Prior Sessions on Login) - Implementation

Date: 2026-04-30  
Plan reference: `docs/patch-notes/194-P1-S2-OPTIONAL-KICK-PRIOR-SESSIONS-PLAN.md`

## What was implemented

This patch adds an optional login behavior to invalidate older user tokens.

## 1) User-level token cutoff persistence

New migration:
- `MuseBar/backend/src/migrations/files/2026_04_30_20_20_00_add_user_token_revocation_cutoffs.sql`

Created table:
- `user_token_revocation_cutoffs`
  - `user_id` (PK, FK users)
  - `revoke_before_iat` (BIGINT)
  - `reason`
  - `updated_at`

Purpose:
- Store a per-user issued-at cutoff used to invalidate older JWTs.

## 2) Token blocklist model extended

Updated:
- `MuseBar/backend/src/models/tokenBlocklist.ts`

Changes:
- `isTokenRevoked(token)` now checks:
  1. token hash blocklist (existing behavior),
  2. user-level cutoff (new behavior):
     - decode token `id` and `iat`,
     - if `iat < revoke_before_iat`, treat as revoked.
- Added:
  - `revokeAllUserTokensIssuedBefore(userId, revokeBeforeIat, reason)`
  - Uses upsert with `GREATEST(...)` to avoid lowering existing strict cutoff.

## 3) Login route optional hook

Updated:
- `MuseBar/backend/src/routes/authLogin.ts`

Changes in `POST /api/auth/login`:
- read optional body flag: `kickPriorSessions` (default false),
- when true:
  - compute cutoff `Math.floor(Date.now() / 1000)`,
  - call `TokenBlocklistModel.revokeAllUserTokensIssuedBefore(...)`
    before minting new token.
- login audit payload now includes `kickPriorSessions`.

Behavior:
- default login flow unchanged when flag is omitted/false.
- when true, older tokens for that user become invalid.

## 4) Regression tests

New:
- `MuseBar/backend/src/routes/authLogin.loginSessionKick.test.ts`

Covered:
- default login does not trigger global revoke,
- `kickPriorSessions: true` triggers cutoff write with expected reason,
- login audit records the flag.

## Verification

Executed:

1. `npm run test -- src/routes/authLogin.loginSessionKick.test.ts src/routes/authLogin.refreshRotation.test.ts src/routes/authLogin.supportImpersonation.test.ts`
   - Result: 3 files passed, 6 tests passed.

2. `npm run type-check`
   - Result: success.

3. Lint diagnostics on touched files
   - Result: no linter errors.

## Outcome

P1-S2 is implemented as requested: login now supports optional prior-session invalidation without changing default session behavior.
