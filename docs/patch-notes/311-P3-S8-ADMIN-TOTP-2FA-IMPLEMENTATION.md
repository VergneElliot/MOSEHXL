# 311 — P3-S8 admin TOTP 2FA (implementation)

## What changed

### 1) Added persistence for user TOTP 2FA state

Created migration:

- `MuseBar/backend/src/migrations/files/2026_05_21_21_40_00_add_user_totp_mfa_columns.sql`

Adds:

- `users.mfa_totp_enabled` (boolean, default false)
- `users.mfa_totp_secret` (text)
- `users.mfa_totp_enabled_at` (timestamptz)
- index on `mfa_totp_enabled`

### 2) Extended user model with MFA helpers

Updated:

- `MuseBar/backend/src/models/user.ts`

Added model operations:

- `getMfaTotpState`
- `setMfaTotpSecret`
- `enableMfaTotp`
- `disableMfaTotp`

### 3) Added TOTP management endpoints

Updated:

- `MuseBar/backend/src/routes/authLogin.ts`

New endpoints:

- `GET /api/auth/2fa/totp/status`
- `POST /api/auth/2fa/totp/setup`
- `POST /api/auth/2fa/totp/enable`
- `POST /api/auth/2fa/totp/disable`

`/setup` returns secret + otpauth URI + QR data URL for app onboarding.

### 4) Enforced admin 2FA on login path

Updated login flow in `authLogin.ts`:

- derives canonical role pre-token issuance
- when enforcement is active and role is admin:
  - blocks login if TOTP not configured (`ADMIN_2FA_SETUP_REQUIRED`)
  - requires valid `totpCode` (`INVALID_2FA_CODE`)

### 5) Added enforcement configuration validation

Updated:

- `MuseBar/backend/src/config/environment.ts`
- `MuseBar/backend/.env.example`

Adds optional env validation/documentation for:

- `AUTH_ENFORCE_ADMIN_2FA` (`true` / `false`)

## Testing

Added test file:

- `MuseBar/backend/src/routes/authLogin.admin2fa.test.ts`

Coverage:

- admin login blocked when setup missing
- admin login rejected on invalid TOTP code

Verification run:

- `npm run type-check` ✅
- `npm test -- src/routes/authLogin.admin2fa.test.ts src/routes/authLogin.loginSessionKick.test.ts src/routes/authLogin.accountLockout.test.ts` ✅
- `npm test` (`52/52` files, `204/204` tests) ✅

## Notes

- This closes `P3-S8` as backend step-up auth baseline for admin roles.
- Recovery code / advanced MFA ergonomics can be layered without changing core enforcement semantics.
