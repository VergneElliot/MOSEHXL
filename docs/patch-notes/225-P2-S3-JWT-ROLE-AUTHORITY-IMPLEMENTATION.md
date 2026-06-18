# 225 - P2-S3 (JWT role authority / legacy `is_admin` rollout) - Implementation

Date: 2026-04-30  
Plan reference: `docs/patch-notes/224-P2-S3-JWT-ROLE-AUTHORITY-PLAN.md`

## What was implemented

This patch makes `role` the practical single authority in newly issued JWTs by
removing legacy `is_admin` from token emission, while keeping one-rollover
compatibility for already-issued tokens.

## 1) Token generation now strips legacy `is_admin`

Updated:
- `MuseBar/backend/src/middleware/auth.ts`

Changes:
1. `JwtPayload.is_admin` is now optional for verification compatibility.
2. `generateToken(...)` now strips `is_admin` before `jwt.sign(...)`.
3. `requireAuth` now computes `req.user.is_admin` safely:
   - uses token claim when present (legacy tokens),
   - otherwise derives from `payload.role === 'system_admin'`.

Result:
- all new tokens signed through `generateToken(...)` no longer carry `is_admin`,
- old tokens continue to authenticate during rollout.

## 2) Auth route token issuers moved to role-first payload

Updated:
- `MuseBar/backend/src/routes/authLogin.ts`

Changes:
1. Login token payload no longer sends `is_admin`.
2. Refresh token payload no longer sends `is_admin`.
3. Support impersonation start/stop token payloads no longer send `is_admin`.
4. Existing response body fields for user profile remain unchanged to avoid
   frontend contract break.

Result:
- token issuance in login/refresh/impersonation is role-authoritative.

## 3) Establishment account creation token payload aligned

Updated:
- `MuseBar/backend/src/services/establishmentAccountCreation/database/UserAccountOperations.ts`

Changes:
1. `generateJWTToken(...)` now signs `role` + `establishment_id` instead of
   `is_admin`.
2. Caller now passes created user role to token generation.

Result:
- this issuance path also stops emitting `is_admin` and carries role context.

## 4) Regression tests added/updated

Updated:
- `MuseBar/backend/src/routes/authLogin.refreshRotation.test.ts`
- `MuseBar/backend/src/routes/authLogin.supportImpersonation.test.ts`

Changes:
1. Refresh test now asserts reissued token omits `is_admin`.
2. Added rollover compatibility case:
   - manually signs a legacy token containing `is_admin`,
   - verifies refresh still succeeds and new token omits `is_admin`.
3. Support impersonation tests now assert emitted tokens omit `is_admin`.

## Verification

Executed:

1. Targeted tests:
   - `npm run test -- src/routes/authLogin.refreshRotation.test.ts src/routes/authLogin.supportImpersonation.test.ts`
   - Result: passed (2 files, 5 tests).
2. Backend type-check:
   - `npm run type-check`
   - Result: passed.
3. Lint diagnostics on touched files:
   - Result: no lint errors.

## Outcome

P2-S3 is implemented with a safe rollout path:
- new tokens no longer emit legacy `is_admin`,
- legacy tokens remain valid for refresh/auth until rotated,
- runtime authorization continues to rely on canonical role/permissions.
