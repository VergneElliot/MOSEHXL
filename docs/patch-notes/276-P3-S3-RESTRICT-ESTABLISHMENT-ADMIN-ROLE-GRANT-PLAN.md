# 276 - P3-S3 (Restrict establishment_admin role grant) - Plan

Date: 2026-05-21  
Source audit: `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md` (P3-S3)

## Why this patch exists

Audit item P3-S3 identified a separation-of-duties bug:

- `PUT /api/auth/users/:id/role` was guarded by `canManageUsers`, so any user
  with `access_user_management` could grant `establishment_admin`.

This allows a compromised or over-privileged user manager to escalate another
account to tenant-wide authority.

## Scope

### In scope

1. Restrict assignment of role `establishment_admin` to requesters that are
   actual system admins (`req.user.is_admin === true`).
2. Keep regular role updates (e.g. to `staff`) unchanged for authorized managers.
3. Add regression tests for denied and allowed paths.

### Out of scope

- Redesigning the role model.
- Introducing additional approval workflows for role grants.

## Strategy

### Step 1 - Route guard

In `routes/authRegister.ts` within `PUT /users/:id/role`:

1. After ownership check, block if:
   - requested role is `establishment_admin`, and
   - requester is not system admin.
2. Return `403` with explicit error message.

### Step 2 - Regression tests

Add dedicated tests:

1. Non-system-admin requester cannot grant `establishment_admin` and no
   side effects occur (no role update, no audit/software-event append).
2. System-admin requester can grant `establishment_admin` and normal side
   effects still happen.

### Step 3 - Verify

1. Targeted auth route tests.
2. Backend type-check.
3. Full backend suite.
4. Lint diagnostics on touched files.

## Acceptance criteria

1. `establishment_admin` grant is blocked for non-system-admin requesters.
2. Existing authorized role updates remain functional.
3. Tests lock the new separation-of-duties rule.

