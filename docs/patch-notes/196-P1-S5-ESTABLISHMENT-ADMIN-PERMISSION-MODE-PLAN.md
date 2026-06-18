# 196 - P1-S5 (Establishment Admin Permission Strategy) - Plan

Date: 2026-04-30  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (P1-S5)

## Why this patch exists

Current behavior grants `establishment_admin` every permission name from DB,
even when `user_permissions` has no explicit rows.

Audit S5 asks to either:

- reconsider this implicit full grant, or
- document it as deliberate and provide a least-privilege alternative.

## Scope

### In scope

1. Keep current behavior as default for backward compatibility.
2. Add explicit least-privilege mode switch via env:
   - `ESTABLISHMENT_ADMIN_PERMISSION_MODE=explicit_only`
3. Validate env value format.
4. Add regression tests for permission mode behavior.
5. Document the implementation.

### Out of scope

- UI-level permission policy management.
- Automatic backfill of missing `user_permissions` rows.

## Design choices

1. **Compatibility-first default**
   - Default remains `implicit_all` to avoid operational lockout.

2. **Least-privilege opt-in**
   - `explicit_only` requires explicit `user_permissions` rows for admins too.

3. **Simple runtime switch**
   - Evaluate mode in `UserModel.getUserPermissions(...)`.

## Strategy

### Step 1 - Permission mode logic

File:
- `MuseBar/backend/src/models/user.ts`

Plan:
- add mode resolver,
- apply current implicit-full behavior only when mode is `implicit_all`,
- in `explicit_only`, establishment admins follow explicit DB permissions.

### Step 2 - Environment validation/config docs

File:
- `MuseBar/backend/src/config/environment.ts`

Plan:
- validate optional env variable values,
- expose it in typed security config.

### Step 3 - Regression tests

File:
- `MuseBar/backend/src/models/user.permissionMode.test.ts` (new)

Plan:
- verify implicit mode returns all permission names for establishment_admin,
- verify explicit mode returns only assigned permissions.

### Step 4 - Verify

Run:
- new model tests,
- related auth permission test sanity,
- backend type-check + lint diagnostics.

## Acceptance criteria

1. Current behavior remains default.
2. Least-privilege mode is available and test-covered.
3. Env validation rejects unsupported mode values.
