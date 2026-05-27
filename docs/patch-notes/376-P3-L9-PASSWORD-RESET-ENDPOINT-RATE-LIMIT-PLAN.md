# 376 - P3-L9 (password reset endpoint rate-limit follow-up) - Plan

## Context

Password lifecycle APIs were implemented, but `POST /auth/password/forgot` and `POST /auth/password/reset` did not use dedicated auth endpoint rate-limit middleware.

This left reset pathways protected only by global request rate limiting and increased abuse surface for reset spam/guess attempts.

## Goal

Apply dedicated per-endpoint auth rate limiting to password reset request and consume paths.

## Planned changes

1. `authPassword.ts`
   - Add `createAuthRateLimitMiddleware` integration for:
     - `/password/forgot` keyed by IP + normalized email hash
     - `/password/reset` keyed by IP + reset token hash
   - Use environment-aware limiter behavior (`development` relaxed, `test` in-memory).
2. Keep existing generic response behavior and audit flow unchanged.

## Verification

- `npm test -- src/routes/authPassword.test.ts`
- `npm run type-check` (backend)
