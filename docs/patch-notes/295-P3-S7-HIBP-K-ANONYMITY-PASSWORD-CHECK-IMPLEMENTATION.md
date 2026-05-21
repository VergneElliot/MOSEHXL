# 295 — P3-S7 HIBP k-anonymity password check (implementation)

## What changed

### 1) Shared breach-aware password validation

- Updated `MuseBar/backend/src/utils/passwordValidation.ts`:
  - Added `validatePasswordWithBreachCheck(password)` (async).
  - Added HIBP k-anonymity range query integration (`/range/{prefix}`) with hash-prefix flow.
  - Added timeout handling and optional fail-open behavior on upstream errors.

### 2) Configuration + env validation

- Updated `MuseBar/backend/src/config/environment.ts` to validate:
  - `PASSWORD_BREACH_CHECK_ENABLED` (`true`/`false`)
  - `PASSWORD_BREACH_CHECK_TIMEOUT_MS` (positive number)
- Updated `MuseBar/backend/.env.example` with the two new optional variables.

### 3) Enforcement across password-setting paths

- Updated password-setting flows to use breach-aware validation:
  - `MuseBar/backend/src/routes/authRegister.ts`
  - `MuseBar/backend/src/routes/authPassword.ts`
  - `MuseBar/backend/src/routes/establishmentAccountCreation/index.ts`
  - `MuseBar/backend/src/services/userInvitation/index.ts`
  - `MuseBar/backend/src/services/establishmentAccountCreation/database/UserAccountOperations.ts`
  - `MuseBar/backend/src/models/user.ts` (model-level guard for create/update password paths)

### 4) Tests

- Added `MuseBar/backend/src/utils/passwordValidation.breachCheck.test.ts`:
  - rejects breached suffix match,
  - accepts non-breached password,
  - fails open on HIBP error.
- Extended route-level password tests:
  - `MuseBar/backend/src/routes/authRegister.passwordPolicy.test.ts`
  - `MuseBar/backend/src/routes/authPassword.test.ts`
  - both now cover breached-password rejection when check is enabled.

## Verification

- Backend type-check: `npm run type-check` ✅
- Targeted tests:
  - `passwordValidation.breachCheck.test.ts`
  - `authRegister.passwordPolicy.test.ts`
  - `authPassword.test.ts` ✅
- Full backend suite: `npx vitest run` (`51/51` files, `202/202` tests) ✅

## Notes

- This closes P3-S7 as an optional, production-usable control.
- Operators can enable it via:
  - `PASSWORD_BREACH_CHECK_ENABLED=true`
  - optional `PASSWORD_BREACH_CHECK_TIMEOUT_MS=<ms>`
