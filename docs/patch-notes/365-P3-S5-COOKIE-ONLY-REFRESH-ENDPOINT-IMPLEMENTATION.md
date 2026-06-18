# 365 - P3-S5 (cookie-only refresh endpoint follow-up) - Implementation

Plan reference: `docs/patch-notes/364-P3-S5-COOKIE-ONLY-REFRESH-ENDPOINT-PLAN.md`

## What changed

### 1) Enforced cookie-only token source for `/auth/refresh`

Updated `MuseBar/backend/src/routes/authLogin.ts`:

- `getRefreshTokenFromRequest()` now supports optional `allowBodyFallback`.
- `/auth/refresh` now requires refresh token cookie only.
- Missing token validation message changed to:
  - `Refresh token cookie is required`
- `/auth/logout` keeps `allowBodyFallback: true` so legacy clients can still best-effort revoke body-sent refresh tokens while migration settles.

### 2) Aligned refresh rate-limit key resolver

Updated `MuseBar/backend/src/middleware/security/AuthEndpointRateLimit.ts`:

- `resolveOpaqueRefreshRateLimitKey()` now keys only from refresh cookie value.
- Removed body-token fallback from key derivation.

### 3) Updated tests

Updated `MuseBar/backend/src/routes/authLogin.refreshRotation.test.ts`:

- Updated missing-token assertion to new cookie-required message.
- Added test that body-only refresh token requests are rejected (400) and do not hit refresh session lookup.

## Verification run

- `npm test -- src/routes/authLogin.refreshRotation.test.ts` -> pass
- `npm run type-check` (backend) -> pass

## Security outcome

Refresh endpoint behavior now matches the transport hardening intent of P3-S5: opaque refresh token acceptance is constrained to httpOnly cookie transport, reducing accidental token propagation through JSON payload paths.
