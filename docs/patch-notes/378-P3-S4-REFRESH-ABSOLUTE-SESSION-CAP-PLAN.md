# 378 - P3-S4 (refresh absolute session cap follow-up) - Plan

## Context

Refresh token rotation is already in place, but the refresh family can continue rotating indefinitely as long as each refresh happens before per-token expiry.

The P2-S16 roadmap explicitly requires sliding refresh with an absolute cap so "remember me" sessions cannot drift forever.

## Goal

Enforce a hard maximum lifetime for each refresh-token family while keeping existing rotation and reuse-detection behavior.

## Planned changes

1. `authLogin.ts`
   - Extend refresh expiry computation to apply:
     - rolling expiry (`1d` or `7d` by remember-me),
     - absolute cap (default `30d`, env-configurable).
   - During `/auth/refresh`, compute next refresh expiry against family start time.
   - If cap is reached, revoke the family and reject refresh with re-auth required.
2. `refreshToken.ts`
   - Add helper to read family first-issued timestamp (`MIN(issued_at)`).
3. Tests
   - Extend refresh-rotation tests with an expired-family scenario.

## Verification

- `npm test -- src/routes/authLogin.refreshRotation.test.ts`
- `npm run type-check` (backend)
