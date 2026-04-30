# 227 - P2-S4 (setup endpoint password validation) - Implementation

Date: 2026-04-30  
Plan reference: `docs/patch-notes/226-P2-S4-SETUP-PASSWORD-VALIDATION-PLAN.md`

## What was implemented

This patch closes P2-S4 by enforcing shared password-strength policy on
`POST /api/auth/setup` instead of only checking field presence.

## 1) Setup route now validates password strength

Updated:
- `MuseBar/backend/src/routes/authRegister.ts`

Changes:
1. Imported `validatePassword` from `utils/passwordValidation`.
2. Added setup-route validation branch:
   - after `email/password` presence check,
   - call `validatePassword(password)`,
   - return `400` with canonical message when invalid.

Result:
- setup now follows the same password policy as the rest of the system.

## 2) Added setup endpoint regression tests

Added:
- `MuseBar/backend/src/routes/authRegister.setup.test.ts`

Coverage:
1. Weak password is rejected with `400` and no bootstrap call.
2. Valid password still creates admin and returns `201`.

Also updated:
- `MuseBar/backend/src/routes/authRegister.softwareEvents.test.ts`

Reason:
- added a local mock for `permissions/registry` in route tests to keep test
  isolation stable when workspace package resolution for `@mosehxl/types` is
  unavailable in direct route-test runs.

## Verification

Executed:

1. Targeted tests:
   - `npm run test -- src/routes/authRegister.setup.test.ts src/routes/authRegister.softwareEvents.test.ts`
   - Result: passed (2 files, 6 tests).
2. Backend type-check:
   - `npm run type-check`
   - Result: passed.
3. Lint diagnostics on touched files:
   - Result: no lint errors.

## Outcome

P2-S4 is complete:
- setup bootstrap no longer accepts weak passwords,
- shared password policy is consistently reused,
- existing successful setup path remains intact.
