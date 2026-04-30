# 233 - P2-S12 (auth endpoint-specific rate limiting) - Implementation

Date: 2026-04-30  
Plan reference: `docs/patch-notes/232-P2-S12-AUTH-ENDPOINT-RATE-LIMITING-PLAN.md`

## What was implemented

This patch closes P2-S12 by adding dedicated, stricter rate limiting for auth
sensitive endpoints (`/auth/login` and `/auth/refresh`), separate from the
global request limiter.

## 1) Added auth endpoint rate limiter utility

Added:
- `MuseBar/backend/src/middleware/security/AuthEndpointRateLimit.ts`

Capabilities:
1. Generic `createAuthRateLimitMiddleware(...)` with:
   - configurable `windowMs`, `maxRequests`, `keyPrefix`, `keyResolver`,
   - standard rate-limit headers and `RateLimitError` when exceeded.
2. Shared-store compatibility:
   - PostgreSQL store when pool is provided,
   - in-memory fallback for tests/dev edge cases.
3. Key resolvers:
   - `resolveLoginRateLimitKey(req)` uses `IP + normalized email SHA-256 hash prefix`.
   - `createRefreshRateLimitKeyResolver(jwtSecret)` uses `IP + token user id` (or `anon` fallback).

## 2) Wired stricter limits on auth routes

Updated:
- `MuseBar/backend/src/routes/authLogin.ts`

Changes:
1. Added route middleware for `POST /login`:
   - keying by IP + email hash,
   - stricter threshold than global limiter.
2. Added route middleware for `POST /refresh` (before `requireAuth`):
   - keying by IP + token user id shard (fallback anon),
   - stricter threshold than global limiter.
3. Added lazy-safe logger bridge for limiter security events so test imports do
   not require eager logger initialization.
4. Added test-environment pool guard:
   - avoids coupling unit tests to PostgreSQL rate-limit table state.

## 3) Added middleware regression tests

Added:
- `MuseBar/backend/src/middleware/security/AuthEndpointRateLimit.test.ts`

Coverage:
1. Login key contains hash and does not leak plaintext email.
2. Refresh key resolver derives user shard from bearer token.
3. Limiter blocks with `RateLimitError` after threshold is exceeded.

## Verification

Executed:

1. Targeted tests:
   - `npm run test -- src/middleware/security/AuthEndpointRateLimit.test.ts src/routes/authLogin.loginSessionKick.test.ts src/routes/authLogin.refreshRotation.test.ts src/routes/authLogin.supportImpersonation.test.ts`
   - Result: passed (4 files, 10 tests).
2. Backend type-check:
   - `npm run type-check`
   - Result: passed.
3. Lint diagnostics on touched files:
   - Result: no lint errors.

## Outcome

P2-S12 is complete:
- login/refresh now have dedicated and stricter abuse throttling,
- keying strategy is more targeted (IP + hashed identifier),
- global rate limiting remains unchanged for broader traffic.
