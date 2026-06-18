# 366 - P3-S5 (refresh CSRF double-submit follow-up) - Plan

## Context

Refresh token transport is cookie-based (`httpOnly`, `SameSite=Strict`), but `/api/auth/refresh` still lacked explicit CSRF validation.

Because cookies are auto-sent by browsers, refresh should enforce a double-submit token to reduce cross-site request forgery risk.

## Goal

Add CSRF double-submit validation for `/api/auth/refresh` while keeping existing auth/session behavior intact.

## Planned changes

1. Backend (`authLogin.ts`)
   - Issue CSRF cookie (`musebar_csrf_token`) on login and refresh.
   - Validate `x-csrf-token` header matches CSRF cookie on `/auth/refresh` (timing-safe compare).
   - Clear CSRF cookie on logout.
2. Frontend (`api/core.ts`)
   - Read CSRF cookie and attach `x-csrf-token` automatically for `/auth/refresh` requests.
3. Tests
   - Update refresh rotation tests to send CSRF cookie/header.
   - Add explicit missing/invalid CSRF test cases.
   - Assert login sets CSRF cookie.

## Verification

- `npm test -- src/routes/authLogin.refreshRotation.test.ts src/routes/authLogin.loginSessionKick.test.ts` (backend)
- `npm run type-check` (backend)
- `npm run type-check` (frontend)
