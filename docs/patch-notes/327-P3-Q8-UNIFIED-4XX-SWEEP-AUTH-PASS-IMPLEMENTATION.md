# 327 — P3-Q8 unified 4xx sweep (auth pass) implementation

## What changed

### 1) Migrated auth 4xx branches to typed errors

Updated:

- `MuseBar/backend/src/routes/authLogin.ts`
- `MuseBar/backend/src/routes/authRegister.ts`
- `MuseBar/backend/src/routes/authPassword.ts`

Changes:

- Replaced ad-hoc 4xx response branches with typed errors:
  - `ValidationError`
  - `AuthenticationError`
  - `AuthorizationError`
  - `NotFoundError`
- Kept custom auth error codes where needed via `AppError`:
  - `ADMIN_2FA_SETUP_REQUIRED`
  - `INVALID_2FA_CODE`
- Hardened route-level catch blocks to preserve typed `AppError` instances instead of coercing them into generic 500 errors.

### 2) Updated tests for centralized 4xx error envelope

Updated:

- `MuseBar/backend/src/routes/authLogin.admin2fa.test.ts`
- `MuseBar/backend/src/routes/authLogin.refreshRotation.test.ts`
- `MuseBar/backend/src/routes/authRegister.passwordPolicy.test.ts`
- `MuseBar/backend/src/routes/authRegister.roleGrantGuard.test.ts`
- `MuseBar/backend/src/routes/authRegister.setup.test.ts`
- `MuseBar/backend/src/routes/authPassword.test.ts`

Changes:

- Mounted `errorHandler` where needed in route tests.
- Updated assertions from legacy `res.body.error` string checks to unified `res.body.error.message` / `res.body.error.code` checks.

## Verification

- `npm run type-check` ✅
- `npm test -- src/routes/authLogin.loginSessionKick.test.ts src/routes/authLogin.refreshRotation.test.ts src/routes/authLogin.accountLockout.test.ts src/routes/authLogin.admin2fa.test.ts src/routes/authRegister.passwordPolicy.test.ts src/routes/authRegister.roleGrantGuard.test.ts src/routes/authRegister.accountUnlock.test.ts src/routes/authPassword.test.ts` ✅
- `npm test` ✅

## Notes

- This is the auth-domain tranche of `P3-Q8`. Remaining route families (legal/invitations/products/printing/setup) are still pending migration to fully close the audit item.
