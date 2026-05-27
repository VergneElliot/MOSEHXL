# 367 - P3-S5 (refresh CSRF double-submit follow-up) - Implementation

Plan reference: `docs/patch-notes/366-P3-S5-REFRESH-CSRF-DOUBLE-SUBMIT-PLAN.md`

## What changed

### 1) Added CSRF token cookie lifecycle in auth session routes

Updated `MuseBar/backend/src/routes/authLogin.ts`:

- Added CSRF cookie name: `musebar_csrf_token`
- Login now sets CSRF cookie alongside refresh cookie.
- Refresh now rotates CSRF cookie alongside refresh cookie.
- Logout clears both refresh and CSRF cookies.

Cookie properties for CSRF token:
- `httpOnly: false` (readable by frontend JS for double-submit header)
- `secure: true` in production
- `sameSite: 'strict'`
- `path: '/api/auth'`

### 2) Enforced double-submit CSRF validation on `/auth/refresh`

In `authLogin.ts`:

- Added `validateRefreshCsrf(req)`:
  - reads CSRF cookie value,
  - reads `x-csrf-token` header,
  - requires both,
  - compares with `crypto.timingSafeEqual` after length check.
- `/auth/refresh` now rejects requests with:
  - `CSRF token is required` (400) when missing,
  - `Invalid CSRF token` (401) when mismatch.

### 3) Frontend auto-header wiring for refresh

Updated `MuseBar/src/services/api/core.ts`:

- Added cookie reader helper.
- For endpoint `/auth/refresh`, automatically injects `x-csrf-token` from `musebar_csrf_token` cookie.

This keeps refresh calls transparent to calling code (`useAuth` did not need API-call signature changes).

### 4) Test updates

Updated backend tests:

- `authLogin.refreshRotation.test.ts`
  - success/unknown-token tests now include CSRF cookie + header,
  - added missing-CSRF and invalid-CSRF negative tests.
- `authLogin.loginSessionKick.test.ts`
  - now asserts login sets `musebar_csrf_token` cookie.

## Verification run

- `npm test -- src/routes/authLogin.refreshRotation.test.ts src/routes/authLogin.loginSessionKick.test.ts` -> pass (8 tests)
- `npm run type-check` (backend) -> pass
- `npm run type-check` (frontend) -> pass

## Security outcome

Cookie-based refresh now has explicit CSRF double-submit protection. This closes the most exposed CSRF surface while preserving existing session UX and refresh rotation semantics.
