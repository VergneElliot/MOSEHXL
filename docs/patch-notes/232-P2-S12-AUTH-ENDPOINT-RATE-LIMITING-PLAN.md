# 232 - P2-S12 (auth endpoint-specific rate limiting) - Plan

Date: 2026-04-30  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (P2-S12)

## Why this patch exists

Global rate limiting exists, but auth endpoints still share the broad app budget.
The audit requires stricter auth-specific limits, especially for:

- `POST /api/auth/login`
- `POST /api/auth/refresh`

to reduce brute-force and abuse risk.

## Scope

### In scope

1. Add dedicated auth endpoint rate limiter middleware.
2. Use stronger auth-specific keying:
   - login: `IP + normalized email hash`,
   - refresh: `IP + token user id` (fallback to `anon`).
3. Apply stricter limits than global middleware.
4. Add middleware-level regression tests.
5. Document implementation and verification.

### Out of scope

- Password reset endpoint rate limiting (future item).
- Full distributed abuse-detection heuristics.

## Design choices

1. **Middleware-level, route-attached limiter**
   - Keep global middleware unchanged.
   - Add targeted limiter directly on login/refresh route definitions.

2. **Shared-store compatibility**
   - Reuse existing rate-limit store adapters (PostgreSQL when pool is available,
     in-memory fallback for tests/dev edge cases).

3. **No plaintext identifier logging in keys**
   - Email component uses SHA-256 hash prefix to avoid raw email in limiter keys.

## Strategy

### Step 1 - Auth limiter utility

New file:
- `MuseBar/backend/src/middleware/security/AuthEndpointRateLimit.ts`

Plan:
1. Implement generic `createAuthRateLimitMiddleware(...)`.
2. Implement key resolvers for login and refresh.
3. Return standard rate-limit headers and `RateLimitError` on exceed.

### Step 2 - Route wiring

File:
- `MuseBar/backend/src/routes/authLogin.ts`

Plan:
1. Attach login limiter to `POST /login`.
2. Attach refresh limiter to `POST /refresh` (before `requireAuth`).
3. Tune limits lower than global baseline.

### Step 3 - Regression tests

New file:
- `MuseBar/backend/src/middleware/security/AuthEndpointRateLimit.test.ts`

Plan:
1. Validate login key hashing behavior.
2. Validate refresh key extraction behavior.
3. Validate limiter blocks once threshold is exceeded.

### Step 4 - Verify

Run:
- targeted middleware/auth tests,
- backend type-check,
- lint diagnostics on touched files.

## Acceptance criteria

1. `/auth/login` and `/auth/refresh` have dedicated stricter rate limits.
2. Login keying uses hashed email, not plaintext.
3. Exceeded auth limits return 429 path via `RateLimitError`.
