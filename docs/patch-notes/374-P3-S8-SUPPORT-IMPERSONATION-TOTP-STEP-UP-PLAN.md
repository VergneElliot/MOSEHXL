# 374 - P3-S8 (support impersonation TOTP step-up follow-up) - Plan

## Context

Admin 2FA was enforced at login, but support impersonation start remained a high-privilege action without an explicit step-up challenge on that endpoint.

Even with valid admin session cookies/tokens, impersonation should require a fresh TOTP verification when 2FA enforcement is active.

## Goal

Require TOTP step-up on `POST /api/auth/support/impersonation/start` when admin 2FA enforcement is enabled.

## Planned changes

1. `authLogin.ts`
   - In support impersonation start route:
     - require enabled admin TOTP setup,
     - require valid `totpCode`,
     - block with typed AppError codes when setup/code invalid.
   - Add audit events for blocked step-up failures.
2. Tests
   - Update support impersonation tests to include TOTP code in success path.
   - Add negative tests:
     - missing setup -> 403 + setup-required code
     - invalid code -> 401 + invalid-code path

## Verification

- `npm test -- src/routes/authLogin.supportImpersonation.test.ts`
- `npm run type-check` (backend)
