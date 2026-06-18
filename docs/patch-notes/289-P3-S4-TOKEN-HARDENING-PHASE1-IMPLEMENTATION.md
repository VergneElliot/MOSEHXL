# 289 — P3-S4 Token hardening phase 1 (implementation)

## What changed

### 1) Opaque refresh-token storage

- Added migration: `MuseBar/backend/src/migrations/files/2026_05_21_19_10_00_add_refresh_session_tokens.sql`.
- Introduced `auth_refresh_tokens` with:
  - `token_hash` (sha256),
  - `family_id` (rotation family),
  - revocation/rotation metadata (`revoked_at`, `rotated_at`, `replaced_by_token_hash`),
  - expiry and client context.

### 2) New refresh-token model

- Added `MuseBar/backend/src/models/refreshToken.ts` with:
  - create,
  - active lookup by raw token,
  - rotate (single-use enforcement),
  - revoke by raw token,
  - revoke all for user.

### 3) Access token lifetime hardened

- Updated `generateToken` default expiration in `MuseBar/backend/src/middleware/auth.ts` from long-lived defaults to `15m`.

### 4) Auth route flow updates

- `MuseBar/backend/src/routes/authLogin.ts`:
  - `/login`: now returns `{ token, refreshToken, expiresIn: '15m', refreshExpiresIn }`.
  - `/refresh`: now accepts opaque `refreshToken` and rotates it server-side, returning fresh access+refresh tokens.
  - `/logout`: now optionally revokes provided refresh token in addition to bearer token.
  - Support-impersonation stop response aligned to short-lived access (`15m`) for standard token re-entry.

### 5) Password-change/reset session invalidation

- `MuseBar/backend/src/routes/authPassword.ts` now revokes opaque refresh sessions via `RefreshTokenModel.revokeAllForUser(...)` after:
  - password reset,
  - password change.

### 6) Frontend auth client update

- `MuseBar/src/hooks/useAuth.ts`:
  - stores `refresh_token`,
  - sends `refreshToken` to `/auth/refresh`,
  - rotates stored refresh token from response.
- `MuseBar/src/components/auth/Login.tsx`, `MuseBar/src/App.tsx`, and `MuseBar/src/types/auth.ts` updated for login payload shape.
- `MuseBar/src/services/api/core.ts` now clears `refresh_token` on 401.

### 7) Test updates

- Updated backend auth route tests:
  - `authLogin.refreshRotation.test.ts`
  - `authLogin.loginSessionKick.test.ts`
  - `authPassword.test.ts`
- Updated frontend hook test:
  - `src/hooks/__tests__/useAuth.test.ts`

## Verification

- Backend: `npm run type-check` ✅
- Backend targeted tests: `npx vitest run src/routes/authLogin.refreshRotation.test.ts src/routes/authLogin.loginSessionKick.test.ts src/routes/authPassword.test.ts` ✅
- Frontend build: `npm run build` ✅
- Frontend test: `npm test -- --watchAll=false src/hooks/__tests__/useAuth.test.ts` ✅

## Notes

- This closes P3-S4 phase 1 (short-lived access + opaque refresh + rotation).
- Cookie/BFF migration remains intentionally deferred to P3-S5.
