# 293 — P3-S6 account lockout and admin unlock (implementation)

## What changed

### 1) Lockout state persisted in database

- Added migration: `MuseBar/backend/src/migrations/files/2026_05_21_19_45_00_add_login_lockout_columns.sql`.
- New `users` columns:
  - `failed_login_attempts` (int, default 0),
  - `lockout_count` (int, default 0),
  - `locked_until` (timestamptz, nullable).
- Added index on `locked_until` for efficient locked-account checks.

### 2) User model lockout helpers

- Updated `MuseBar/backend/src/models/user.ts`:
  - `incrementFailedLoginAttempts(userId)`
  - `applyLoginLockout(userId, lockedUntil)`
  - `clearLoginLockoutState(userId)`
  - `unlockUserAccount(userId)`
- Extended `UserRow` interface with lockout fields.

### 3) Login route enforcement

- Updated `MuseBar/backend/src/routes/authLogin.ts`:
  - Rejects inactive users.
  - Blocks locked users with `423` and `ACCOUNT_LOCKED` code.
  - Increments failed attempts on bad password.
  - Applies lockout when threshold is reached.
  - Uses progressive lock durations (exponential backoff, capped).
  - Clears lockout failure state on successful authentication.

### 4) Admin unlock endpoint

- Updated `MuseBar/backend/src/routes/authRegister.ts`:
  - Added `PUT /api/auth/users/:id/unlock`
  - Requires existing user-management scope and same-establishment ownership.
  - Clears lockout state and emits `ACCOUNT_UNLOCKED` audit entry.

### 5) Regression tests

- Added `MuseBar/backend/src/routes/authLogin.accountLockout.test.ts`.
- Added `MuseBar/backend/src/routes/authRegister.accountUnlock.test.ts`.
- Updated `MuseBar/backend/src/routes/authLogin.loginSessionKick.test.ts` with lockout-state mocks.

## Verification

- Backend type-check: `npm run type-check` ✅
- Targeted auth tests:
  - `authLogin.accountLockout.test.ts` ✅
  - `authLogin.loginSessionKick.test.ts` ✅
  - `authLogin.refreshRotation.test.ts` ✅
  - `authRegister.accountUnlock.test.ts` ✅
  - `authRegister.roleGrantGuard.test.ts` ✅
- Full backend suite: `npx vitest run` (`50/50` files, `197/197` tests) ✅

## Notes

- This closes P3-S6 (account lockout + admin unlock).
- Threshold and lockout durations are configurable via:
  - `AUTH_LOCKOUT_MAX_FAILED_ATTEMPTS` (default `5`)
  - `AUTH_LOCKOUT_BASE_MINUTES` (default `15`)
  - `AUTH_LOCKOUT_MAX_MINUTES` (default `240`)
