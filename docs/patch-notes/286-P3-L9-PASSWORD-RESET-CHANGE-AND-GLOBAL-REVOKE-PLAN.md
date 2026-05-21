# 286 - P3-L9 (Password reset/change API + global session revoke) - Plan

Date: 2026-05-21  
Source audit: `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md` (P3-L9)

## Why this patch exists

The audit flagged a critical identity gap:

- `authPassword.ts` was an empty placeholder.
- `password_reset_requests` table existed in schema but had no API.
- no enforced global token/session invalidation on password change/reset.

P3-L9 requires production-ready password lifecycle routes and mandatory global
session revoke semantics.

## Scope

### In scope

1. Implement password routes in `authPassword.ts`:
   - `POST /api/auth/password/forgot`
   - `POST /api/auth/password/reset`
   - `POST /api/auth/password/change` (authenticated)
2. Add model wrapper for `password_reset_requests` CRUD.
3. Add user password-update model method with shared password policy enforcement.
4. Enforce global session revocation after successful reset/change via
   `revokeAllUserTokensIssuedBefore(userId, now)`.
5. Revoke current bearer token on `/password/change` for immediate cutover.
6. Add route tests for key security flows.

### Out of scope

- Full frontend reset UI.
- 2FA or breached-password checks (separate backlog items).

## Strategy

### Step 1 - Data/model layer

1. Add `PasswordResetRequestModel` for:
   - invalidating prior active requests,
   - creating reset request rows,
   - fetching valid token rows,
   - marking request as used.
2. Add `UserModel.updatePasswordById()` with policy validation + bcrypt hash.

### Step 2 - Route implementation

In `authPassword.ts`:

1. `/password/forgot`
   - generic response to avoid user enumeration,
   - create token hash + request row for known user,
   - optional password-reset email send via template.
2. `/password/reset`
   - validate token + new password policy,
   - update password and consume token,
   - global revoke cutoff with reason `PASSWORD_RESET`.
3. `/password/change`
   - require auth + current password verification,
   - enforce new password policy and difference from current password,
   - update password,
   - global revoke cutoff (`PASSWORD_CHANGE`) + current token blocklist revoke.

### Step 3 - Tests and verification

1. Add focused route tests for:
   - generic forgot response,
   - reset invalid token,
   - reset success with global revoke,
   - change success with global revoke and current-token revoke.
2. Run type-check + full backend tests.

## Acceptance criteria

1. Password reset and password change endpoints are implemented and mounted.
2. Successful reset/change revokes prior tokens globally.
3. Password policy is enforced on new password values.
4. Route behavior is regression-tested.

