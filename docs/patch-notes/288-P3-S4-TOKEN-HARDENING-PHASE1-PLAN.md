# 288 — P3-S4 Token hardening phase 1 (plan)

## Objective

Implement phase 1 of P2-S16/P3-S4 by replacing long-lived bearer-only auth with:

- short-lived access JWTs (`15m` max),
- opaque refresh tokens stored server-side,
- refresh-token rotation on each refresh,
- user-wide refresh-session revocation on password reset/change.

## Scope

### In scope

- Backend refresh-token persistence model and migration.
- `/api/auth/login` issuance of access + refresh tokens.
- `/api/auth/refresh` conversion from bearer-refresh to opaque refresh flow.
- `/api/auth/logout` support for refresh-token revocation.
- Password reset/change revoking opaque refresh sessions.
- Frontend auth hook update to persist and rotate refresh token.

### Out of scope (next item)

- Moving tokens to httpOnly cookies/BFF (`P3-S5`).
- CSRF protections tied to cookie auth mode.
- Asymmetric JWT signing/JWKS.

## Design decisions

1. **Access token lifetime fixed to 15 minutes** regardless of remember-me; remember-me now controls refresh token lifetime only.
2. **Refresh token is opaque random bytes**, persisted only as `sha256(token)` in DB.
3. **Refresh rotation is single-use**: a used refresh token is revoked with `ROTATED` and linked to a replacement hash.
4. **Password credential changes invalidate all refresh sessions** for that user.

## Verification plan

- Backend type-check.
- Targeted tests for login/refresh/password routes.
- Frontend auth-hook test.
- Frontend production build.
