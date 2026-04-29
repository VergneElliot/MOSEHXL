# 109 - P0-6 (D1 Token Rotation on Refresh + Impersonation Start) - Implementation

Date: 2026-04-29  
Related plan: `docs/patch-notes/108-P0-6-D1-TOKEN-ROTATION-ON-REFRESH-AND-IMPERSONATION-START-PLAN.md`

## What was implemented

## 1) Refresh endpoint now rotates the current bearer token

Updated:
- `MuseBar/backend/src/routes/authLogin.ts`

Changes in `POST /api/auth/refresh`:
- after generating new token and audit logging, route now:
  - reads current bearer token from `Authorization`,
  - revokes it via `revokeTokenOrThrow(...)` with reason `TOKEN_REFRESH_ROTATED`,
  - returns new token only after successful revocation.

## 2) Impersonation start now rotates out the current admin token

Updated:
- `MuseBar/backend/src/routes/authLogin.ts`

Changes in `POST /api/auth/support/impersonation/start`:
- after issuing support token and audit logging, route now:
  - reads current bearer token from `Authorization`,
  - revokes it via `revokeTokenOrThrow(...)` with reason `SUPPORT_IMPERSONATION_STARTED`,
  - returns support token only after successful revocation.

This closes the previously reported parallel-valid-token window for these two lifecycle paths.

## 3) Regression tests added/updated

Added:
- `MuseBar/backend/src/routes/authLogin.refreshRotation.test.ts`

Coverage:
- `POST /auth/refresh`:
  - returns a new token,
  - logs `TOKEN_REFRESH`,
  - inserts old bearer token hash into `token_blocklist` with reason `TOKEN_REFRESH_ROTATED`.

Updated:
- `MuseBar/backend/src/routes/authLogin.supportImpersonation.test.ts`

Coverage extension:
- start impersonation test now also asserts blocklist insertion with reason `SUPPORT_IMPERSONATION_STARTED`.

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/routes/authLogin.supportImpersonation.test.ts src/routes/authLogin.refreshRotation.test.ts` ✅
   - Result: 2 files passed, 4 tests passed.

2. `npm run type-check` ✅
   - Result: TypeScript no-emit check passed.

3. Lints check (edited files) ✅
   - No linter errors on:
     - `authLogin.ts`
     - `authLogin.refreshRotation.test.ts`
     - `authLogin.supportImpersonation.test.ts`

## Outcome

P0-6 is complete:
- refresh no longer leaves old bearer token active after successful rotation,
- support impersonation start no longer leaves old admin token active,
- regression tests now cover both rotation paths.
