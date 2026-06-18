# 310 — P3-S8 admin TOTP 2FA (plan)

## Objective

Implement step-up authentication for admin roles using TOTP-based 2FA (`system_admin`, `establishment_admin`) while preserving current login behavior for non-admin roles.

## Scope

### In scope

- Add DB columns to persist TOTP setup/enabled state on users.
- Add auth endpoints for TOTP lifecycle:
  - status
  - setup (secret + otpauth URI + QR payload)
  - enable
  - disable
- Enforce TOTP challenge during login for admin roles when admin 2FA enforcement is enabled.
- Add regression tests for admin login gating.

### Out of scope

- Recovery codes / backup devices.
- mandatory frontend UX flow changes.
- hardware key / WebAuthn support.

## Design decisions

1. Use standards-compatible TOTP (RFC6238) via `otplib`.
2. Make enforcement environment-controlled (`AUTH_ENFORCE_ADMIN_2FA`) with safe default:
   - production: enforced by default
   - non-production: disabled by default
3. Keep non-admin login path unchanged.
4. Require both current password and valid TOTP code for disable action.

## Verification plan

- Backend type-check.
- Targeted auth login tests including admin 2FA enforcement.
- Full backend test suite.
