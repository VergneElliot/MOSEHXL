# 364 - P3-S5 (cookie-only refresh endpoint follow-up) - Plan

## Context

Refresh token transport was moved to httpOnly cookies under P3-S5, but backend refresh handling still accepted `refreshToken` from request body as a fallback.

That fallback weakens the transport hardening goal and keeps an unnecessary token ingestion path alive.

## Goal

Enforce cookie-only refresh on `/api/auth/refresh` and align rate-limit keying with cookie-only semantics.

## Planned changes

1. `authLogin.ts`
   - Keep cookie parsing as primary source.
   - Remove body fallback for `/refresh`.
   - Return explicit validation error when refresh cookie is missing.
   - Preserve backward-compatible body fallback only for `/logout` best-effort revocation path.
2. `AuthEndpointRateLimit.ts`
   - Remove request-body fallback from opaque refresh rate-limit key resolver.
3. Tests
   - Update refresh rotation tests for new validation message.
   - Add a case asserting body-only refresh tokens are rejected.

## Verification

- `npm test -- src/routes/authLogin.refreshRotation.test.ts`
- `npm run type-check` (backend)
