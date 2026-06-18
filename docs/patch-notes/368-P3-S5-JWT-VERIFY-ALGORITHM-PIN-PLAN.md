# 368 - P3-S5 (JWT verify algorithm pin follow-up) - Plan

## Context

Token hardening follow-ups already landed cookie-only refresh ingestion and CSRF double-submit for refresh.

The remaining immediate hardening item from the P2-S16 roadmap was algorithm pinning on JWT verification (`algorithms: ['HS256']`) to prevent algorithm-confusion fallback behavior.

## Goal

Ensure every runtime `jwt.verify(...)` call in backend code explicitly pins allowed algorithms to `HS256` until asymmetric signing migration (`RS256`/JWKS) is implemented.

## Planned changes

- Update verification call sites:
  - `middleware/auth.ts`
  - `middleware/security/AuthEndpointRateLimit.ts`
  - `middleware/security/RateLimitMiddleware.ts`
  - `services/setup/wizard/SetupAuthManager.ts`
- Use explicit `VerifyOptions` constants to keep call sites uniform and reviewable.
- Keep signing unchanged (`HS256`) for current phase.

## Verification

- Run targeted middleware tests:
  - `src/middleware/auth.permission.test.ts`
  - `src/middleware/security/AuthEndpointRateLimit.test.ts`
- Run backend type-check:
  - `npm run type-check`
