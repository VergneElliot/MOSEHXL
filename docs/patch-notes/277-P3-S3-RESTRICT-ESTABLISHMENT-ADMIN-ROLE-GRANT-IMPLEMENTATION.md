# 277 - P3-S3 (Restrict establishment_admin role grant) - Implementation

Date: 2026-05-21  
Related plan: `docs/patch-notes/276-P3-S3-RESTRICT-ESTABLISHMENT-ADMIN-ROLE-GRANT-PLAN.md`

## What changed

### 1) Added separation-of-duties guard on role escalation

Updated:

- `MuseBar/backend/src/routes/authRegister.ts`

In `PUT /auth/users/:id/role`, the route now rejects:

- role target: `establishment_admin`
- requester: `req.user.is_admin !== true`

Response:

- `403` with message: `"Only system administrators can grant establishment_admin role"`.

This prevents users with `access_user_management` alone from escalating tenant
authority.

### 2) Added dedicated regression tests

Added:

- `MuseBar/backend/src/routes/authRegister.roleGrantGuard.test.ts`

Coverage:

1. Non-system-admin requester is denied when trying to grant `establishment_admin`,
   with no role update/audit/software-event side effects.
2. System-admin requester can grant `establishment_admin`, with expected side effects.

## Verification

Executed:

1. `npx vitest run src/routes/authRegister.roleGrantGuard.test.ts src/routes/authRegister.softwareEvents.test.ts src/routes/authRegister.passwordPolicy.test.ts` -> pass
2. `npm run type-check` (backend) -> pass
3. `npx vitest run` (backend full suite) -> pass (`46/46`, `180/180`)
4. lint diagnostics on touched files -> no issues

## Result

P3-S3 is now closed:

- granting `establishment_admin` is restricted to actual system admins,
- tenant manager permission alone is no longer enough to escalate role authority.

