# 372 - P3-S6 (refresh inactive/locked enforcement follow-up) - Plan

## Context

Login already enforced `is_active` and lockout checks, but refresh could still reissue access tokens for users who were later deactivated or currently locked.

That creates a session-lifecycle gap: account state changes were not fully enforced on refresh path.

## Goal

Apply active/lockout checks during `/auth/refresh` and fail closed with session revocation when blocked.

## Planned changes

1. In `authLogin.ts` refresh route:
   - after loading `userRow`, enforce:
     - `is_active !== false`
     - `locked_until` not in future
   - on block:
     - revoke all refresh tokens for user (`RefreshTokenModel.revokeAllForUser`)
     - clear refresh + CSRF cookies
     - audit `TOKEN_REFRESH_BLOCKED`
     - return authorization error
2. Add tests in refresh rotation suite:
   - inactive user refresh blocked
   - locked user refresh blocked

## Verification

- `npm test -- src/routes/authLogin.refreshRotation.test.ts`
- `npm run type-check` (backend)
