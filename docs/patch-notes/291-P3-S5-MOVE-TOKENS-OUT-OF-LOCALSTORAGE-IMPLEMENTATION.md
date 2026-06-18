# 291 — P3-S5 move tokens out of localStorage (implementation)

## What changed

### Backend refresh cookie transport

- Updated `MuseBar/backend/src/routes/authLogin.ts`:
  - Added helpers to read refresh token from cookie/body and to set/clear refresh cookie.
  - `POST /auth/login` now sets `musebar_refresh_token` cookie (`httpOnly`, `SameSite=Strict`, `Secure` in prod, scoped to `/api/auth`).
  - `POST /auth/refresh` now consumes refresh token from cookie (with temporary body fallback), rotates server-side token, and re-sets cookie.
  - `POST /auth/logout` revokes refresh token and clears refresh cookie.

### Refresh rate-limit keying aligned with cookie mode

- Updated `MuseBar/backend/src/middleware/security/AuthEndpointRateLimit.ts`:
  - `resolveOpaqueRefreshRateLimitKey` now extracts refresh token from cookie first (body fallback) before hashing.

### Frontend storage migration

- Updated `MuseBar/src/hooks/useAuth.ts`:
  - Removed persisted `auth_token` / `refresh_token` handling from localStorage.
  - Access token is now kept in memory state only.
  - Refresh now posts only `{ rememberMe }`; cookie is sent by browser credentials mode.
  - Added bootstrap refresh attempt on mount.
- Updated API core fetch behavior in `MuseBar/src/services/api/core.ts` to always send `credentials: 'include'`.
- Updated `MuseBar/src/components/auth/Login.tsx`, `MuseBar/src/App.tsx`, and `MuseBar/src/types/auth.ts` to reflect the response contract (no refresh token in JSON).

### Local-storage token fallback cleanup

- Updated `MuseBar/src/services/authHelper.ts` to stop reading localStorage token.
- Updated `MuseBar/src/components/PrinterSetup/PrinterSetup.tsx` to use in-memory token (`apiCore.getToken()`) and include credentials for fetch calls.

### Tests updated

- Backend:
  - `authLogin.loginSessionKick.test.ts`
  - `authLogin.refreshRotation.test.ts`
- Frontend:
  - `src/hooks/__tests__/useAuth.test.ts`

## Verification

- Backend type-check: `npm run type-check` ✅
- Backend targeted tests: `npx vitest run src/routes/authLogin.refreshRotation.test.ts src/routes/authLogin.loginSessionKick.test.ts` ✅
- Backend full suite: `npx vitest run` (`48/48`, `192/192`) ✅
- Frontend build: `npm run build` ✅
- Frontend auth hook test: `npm test -- --watchAll=false src/hooks/__tests__/useAuth.test.ts` ✅

## Notes

- This closes P3-S5 core objective (remove token persistence from localStorage and move refresh transport to httpOnly cookie mode).
- CSRF double-submit remains a follow-up hardening step for the full P2-S16 transport model.
