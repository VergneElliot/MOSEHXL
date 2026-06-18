# 377 - P3-L9 (password reset endpoint rate-limit follow-up) - Implementation

Plan reference: `docs/patch-notes/376-P3-L9-PASSWORD-RESET-ENDPOINT-RATE-LIMIT-PLAN.md`

## What changed

Updated `MuseBar/backend/src/routes/authPassword.ts` to add dedicated auth endpoint rate limits:

- `forgotPasswordRateLimit` on `POST /auth/password/forgot`
  - key: `ip + normalized email hash`
  - message: `Too many password reset requests. Please retry later.`
- `resetPasswordRateLimit` on `POST /auth/password/reset`
  - key: `ip + reset token hash`
  - message: `Too many password reset attempts. Please retry later.`

Implementation details:

- Reused `createAuthRateLimitMiddleware` from security middleware stack.
- Added route-local hash helper for stable privacy-preserving key material.
- Uses shared pool outside tests; test environment remains in-memory to keep deterministic unit tests.

## Verification run

- `npm test -- src/routes/authPassword.test.ts` -> pass
- `npm run type-check` (backend) -> pass

## Security outcome

Password reset flows are now protected by dedicated auth throttling controls, reducing brute-force/reset abuse risk and aligning reset endpoints with the hardened auth rate-limit posture already used on login/refresh.
