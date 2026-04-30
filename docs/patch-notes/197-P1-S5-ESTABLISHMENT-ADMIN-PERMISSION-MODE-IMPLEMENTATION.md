# 197 - P1-S5 (Establishment Admin Permission Strategy) - Implementation

Date: 2026-04-30  
Plan reference: `docs/patch-notes/196-P1-S5-ESTABLISHMENT-ADMIN-PERMISSION-MODE-PLAN.md`

## What was implemented

This patch addresses P1-S5 by keeping existing admin-permission behavior as default
while adding a least-privilege alternative mode.

## 1) Permission mode switch in user permission resolution

Updated:
- `MuseBar/backend/src/models/user.ts`

Changes:
- Added mode resolver:
  - `implicit_all` (default)
  - `explicit_only` (least-privilege)
- `getUserPermissions(...)` now behaves as:
  - `establishment_admin` + `implicit_all`: return all permission names from `permissions`.
  - `establishment_admin` + `explicit_only`: use explicit `user_permissions` rows.
  - other roles: unchanged explicit behavior.

## 2) Environment validation and typed config support

Updated:
- `MuseBar/backend/src/config/environment.ts`

Changes:
- Validate optional `ESTABLISHMENT_ADMIN_PERMISSION_MODE` values:
  - allowed: `implicit_all`, `explicit_only`.
- Added typed config field:
  - `security.establishmentAdminPermissionMode`.

This makes policy choice explicit and auditable at deployment config level.

## 3) Regression tests

New:
- `MuseBar/backend/src/models/user.permissionMode.test.ts`

Coverage:
- default mode grants all permissions for `establishment_admin`,
- `explicit_only` mode uses explicit assignments only.

Also ran:
- `src/middleware/auth.permission.test.ts` to ensure permission middleware flow remains stable.

## Verification

Executed:

1. `npm run test -- src/models/user.permissionMode.test.ts src/middleware/auth.permission.test.ts`
   - Result: 2 files passed, 9 tests passed.

2. `npm run type-check`
   - Result: success.

3. Lint diagnostics on touched files
   - Result: no linter errors.

## Outcome

P1-S5 is satisfied with both audit options:
- existing implicit admin grant is documented and preserved by default,
- least-privilege alternative is now available by config (`explicit_only`).
