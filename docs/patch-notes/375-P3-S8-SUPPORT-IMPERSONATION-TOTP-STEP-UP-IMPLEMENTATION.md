# 375 - P3-S8 (support impersonation TOTP step-up follow-up) - Implementation

Plan reference: `docs/patch-notes/374-P3-S8-SUPPORT-IMPERSONATION-TOTP-STEP-UP-PLAN.md`

## What changed

### 1) Added TOTP step-up enforcement to support impersonation start

Updated `MuseBar/backend/src/routes/authLogin.ts` (`POST /auth/support/impersonation/start`):

- When admin 2FA enforcement is active, route now:
  - checks admin has TOTP setup enabled,
  - validates `totpCode` with `speakeasy.totp.verify(...)`,
  - blocks start with typed errors when missing/invalid:
    - `SUPPORT_IMPERSONATION_2FA_SETUP_REQUIRED` (403),
    - `SUPPORT_IMPERSONATION_INVALID_2FA_CODE` (401).
- Added `SUPPORT_IMPERSONATION_BLOCKED` audit entries for both block reasons.

This makes support impersonation a step-up protected action rather than only relying on initial login-time 2FA.

### 2) Expanded route tests

Updated `MuseBar/backend/src/routes/authLogin.supportImpersonation.test.ts`:

- Added `errorHandler` wiring for structured error assertions.
- Mocked `UserModel.getMfaTotpState` and `speakeasy.totp.verify`.
- Success and revoked-token start tests now include `totpCode` input.
- Added negative tests:
  - 2FA setup missing -> 403 + `SUPPORT_IMPERSONATION_2FA_SETUP_REQUIRED`
  - invalid TOTP code -> 401 + `SUPPORT_IMPERSONATION_INVALID_2FA_CODE`

## Verification run

- `npm test -- src/routes/authLogin.supportImpersonation.test.ts` -> pass (5 tests)
- `npm run type-check` (backend) -> pass

## Security outcome

High-privilege support impersonation now requires fresh second-factor proof at action time (step-up), reducing risk from stolen or unattended admin sessions.
