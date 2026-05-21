# 287 - P3-L9 (Password reset/change API + global session revoke) - Implementation

Date: 2026-05-21  
Related plan: `docs/patch-notes/286-P3-L9-PASSWORD-RESET-CHANGE-AND-GLOBAL-REVOKE-PLAN.md`

## What changed

### 1) Replaced empty password router with real API endpoints

Updated:

- `MuseBar/backend/src/routes/authPassword.ts`

Implemented:

1. `POST /api/auth/password/forgot`
   - validates email input,
   - returns generic non-enumerating success message,
   - for existing users:
     - rotates old active reset requests to used,
     - creates new hashed reset-token request (60 min expiry),
     - sends `password_reset` template email when email service is configured.
2. `POST /api/auth/password/reset`
   - validates token + password policy,
   - consumes valid reset request,
   - updates password,
   - executes global token cutoff revoke with reason `PASSWORD_RESET`.
3. `POST /api/auth/password/change` (requires auth)
   - verifies current password,
   - enforces password policy + non-reuse of current password,
   - updates password,
   - executes global token cutoff revoke with reason `PASSWORD_CHANGE`,
   - blocklists current bearer token for immediate session cutover.

### 2) Added password reset request model wrapper

Added:

- `MuseBar/backend/src/models/passwordResetRequest.ts`

Methods:

1. `invalidateActiveRequestsForUser`
2. `createRequest`
3. `findValidByTokenHash`
4. `markUsed`

This keeps token lifecycle logic out of route SQL strings and centralizes reset
request semantics.

### 3) Added user password update model method

Updated:

- `MuseBar/backend/src/models/user.ts`

Added:

- `updatePasswordById(userId, password)`

Behavior:

1. validates shared password policy (`assertPasswordPolicy`),
2. hashes with bcrypt,
3. updates `password_hash` + `updated_at`.

### 4) Added route regression tests

Added:

- `MuseBar/backend/src/routes/authPassword.test.ts`

Covers:

1. forgot-password generic response for unknown email,
2. forgot-password request+email path for known user,
3. reset-token invalid flow,
4. reset success path with global revoke,
5. change success path with global revoke + current-token revoke.

## Verification

Executed:

1. `npx vitest run src/routes/authPassword.test.ts` -> pass
2. `npm run type-check` (backend) -> pass
3. `npx vitest run` (backend full suite) -> pass (`48/48`, `190/190`)
4. lint diagnostics on touched files -> no issues

## Result

P3-L9 is closed:

- password reset/change APIs are operational,
- password policy is enforced in reset/change path,
- successful password changes now enforce global session revocation.

