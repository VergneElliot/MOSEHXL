# 237 - P2-S17 (refresh rememberMe consistency) - Implementation

Date: 2026-05-01  
Plan reference: `docs/patch-notes/236-P2-S17-REFRESH-REMEMBERME-CONSISTENCY-PLAN.md`

## What was implemented

This patch closes P2-S17 by making frontend refresh requests carry the
remember-me intent explicitly, so backend token expiry stays consistent with the
session mode selected at login.

## 1) Refresh call now sends `rememberMe`

Updated:
- `MuseBar/src/hooks/useAuth.ts`

Changes:
1. `refreshToken()` now computes `rememberMeForRefresh` from:
   - hook state (`rememberMe`), with
   - localStorage fallback (`remember_me`).
2. Refresh request now sends payload:
   - `POST /auth/refresh` with `{ rememberMe: rememberMeForRefresh }`.
3. Refresh response handling now persists session metadata:
   - updates `rememberMe`,
   - updates `tokenExpiresIn` from backend `expiresIn` (or derived fallback),
   - syncs `remember_me` and `token_expires_in` in localStorage.

Result:
- remembered sessions no longer silently downgrade to short-lived refresh tokens.

## 2) Added hook regression tests

Added:
- `MuseBar/src/hooks/__tests__/useAuth.test.ts`

Coverage:
1. After remembered login, refresh sends `{ rememberMe: true }`.
2. When needed, refresh falls back to localStorage `remember_me=true` and still
   sends `{ rememberMe: true }`.

## Verification

Executed:

1. Targeted frontend test:
   - `CI=true npm run test -- --watchAll=false src/hooks/__tests__/useAuth.test.ts`
   - Result: passed (1 suite, 2 tests).
2. Frontend type-check:
   - `npm run type-check`
   - Result: passed.
3. Lint diagnostics on touched files:
   - Result: no lint errors.

## Outcome

P2-S17 is complete:
- refresh token requests now carry session-lifetime intent explicitly,
- remember-me behavior is stable across refresh cycles,
- regression tests lock the contract.
