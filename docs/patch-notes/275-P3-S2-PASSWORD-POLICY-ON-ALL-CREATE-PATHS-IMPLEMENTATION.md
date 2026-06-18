# 275 - P3-S2 (Password policy on all account-creation paths) - Implementation

Date: 2026-05-21  
Related plan: `docs/patch-notes/274-P3-S2-PASSWORD-POLICY-ON-ALL-CREATE-PATHS-PLAN.md`

## What changed

### 1) Enforced shared password policy on remaining auth creation routes

Updated:

- `MuseBar/backend/src/routes/authRegister.ts`

Changes:

1. Added `validatePassword()` enforcement in `POST /auth/register`.
2. Added `validatePassword()` enforcement in `POST /auth/users`.
3. Both endpoints now return `400` with the canonical shared validator message
   (for example: "Password must be at least 8 characters long") when policy fails.
4. `/auth/register` invalid-password path also logs a failed audit action,
   consistent with existing route audit discipline.

### 2) Added model-level guard to prevent policy bypass

Updated:

- `MuseBar/backend/src/models/user.ts`

Changes:

1. Added private `assertPasswordPolicy()` helper using `validatePassword()`.
2. Applied guard in:
   - `UserModel.createUser`
   - `UserModel.createUserForEstablishment`
3. Guard throws a `statusCode: 400` error for weak passwords so callers cannot
   bypass policy by invoking model creation methods directly.

### 3) Added targeted regression tests

Added:

- `MuseBar/backend/src/routes/authRegister.passwordPolicy.test.ts`

Covers:

1. `POST /auth/register` rejects weak password and does not call `createUser`.
2. `POST /auth/users` rejects weak password and does not call `createUserForEstablishment`.

Updated:

- `MuseBar/backend/src/routes/authRegister.softwareEvents.test.ts`

Changes:

1. Updated user-creation fixture password from weak value to compliant value so
   existing software-event assertions continue to represent valid behavior.

## Verification

Executed:

1. `npx vitest run src/routes/authRegister.passwordPolicy.test.ts src/routes/authRegister.setup.test.ts src/routes/authRegister.softwareEvents.test.ts` -> pass
2. `npm run type-check` (backend) -> pass
3. `npx vitest run` (backend full suite) -> pass (`45/45`, `178/178`)
4. lint diagnostics on touched files -> no issues

## Result

P3-S2 is now closed:

- every user creation path in auth routes enforces the shared password policy,
- model-level guard prevents future direct-call bypass,
- regression tests lock the behavior.

