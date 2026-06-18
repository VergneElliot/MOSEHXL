# 290 — P3-S5 move tokens out of localStorage (plan)

## Objective

Reduce XSS blast radius by removing token persistence in frontend storage and migrating refresh transport to httpOnly cookie mode.

## Scope

### In scope

- Backend auth routes issue/rotate/clear refresh token via httpOnly cookie.
- Frontend no longer stores access or refresh token in `localStorage`.
- Frontend refresh flow relies on cookie transport with `credentials: 'include'`.
- Existing bearer access-token header flow remains for API authorization.

### Out of scope

- Full CSRF double-submit layer for all mutating routes.
- BFF session proxy architecture.

## Design decisions

1. Keep access JWT short-lived (`15m`) and in-memory only on frontend.
2. Persist refresh token only as server-set `httpOnly` cookie (`SameSite=Strict`, `Secure` in prod).
3. Support a temporary request-body fallback for refresh token parsing to avoid abrupt breakage during transition.

## Verification plan

- Backend type-check and auth-route tests.
- Frontend auth hook test and production build.
- Full backend vitest run for regression confidence.
