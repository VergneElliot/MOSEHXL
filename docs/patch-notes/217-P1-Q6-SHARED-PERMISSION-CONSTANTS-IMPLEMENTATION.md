# 217 - P1-Q6 (Shared permission constants backend/frontend) - Implementation

Date: 2026-04-30  
Plan reference: `docs/patch-notes/216-P1-Q6-SHARED-PERMISSION-CONSTANTS-PLAN.md`

## What was implemented

This patch closes P1-Q6 by removing permission-string duplication between backend
and frontend and introducing one shared source via `@mosehxl/types`.

## 1) Shared permission constants in `@mosehxl/types`

Updated:
- `MuseBar/packages/types/index.d.ts`
- `MuseBar/packages/types/src/index.ts`
- `MuseBar/packages/types/package.json`

New:
- `MuseBar/packages/types/index.js`

Changes:
1. Added shared `PERMISSIONS` constant set.
2. Added shared `PermissionName` type.
3. Added runtime `index.js` export for `PERMISSIONS`.
4. Switched package `main` from `index.d.ts` to `index.js` (types stay in
   `index.d.ts`).

Result:
- shared package now supports both type usage and runtime constant imports.

## 2) Backend registry now consumes shared source

Updated:
- `MuseBar/backend/src/permissions/registry.ts`

Change:
- replaced local literal object with:
  - `import { PERMISSIONS } from '@mosehxl/types'`
  - `export const P = PERMISSIONS`

Result:
- backend permission registry remains API-compatible while being sourced from
  the shared constant set.

## 3) Frontend `AppRouter` now uses shared constants

Updated:
- `MuseBar/src/components/common/AppRouter.tsx`

Changes:
1. Imported `PERMISSIONS` and `PermissionName` from `@mosehxl/types`.
2. Replaced hard-coded permission strings in:
   - tab config permissions,
   - user-management visibility checks,
   - POS line permission checks,
   - history cancel/return permission checks.
3. `TabConfig.permission` is now typed as `PermissionName`.

Result:
- frontend audited permission checks now point to the same source as backend.

## Verification

Executed:

1. `npm run type-check` (backend)
   - Result: success.

2. `npm run type-check` (frontend `MuseBar`)
   - Result: success.

3. Lint diagnostics on touched files
   - Result: no linter errors.

## Outcome

P1-Q6 is complete:
- backend registry and frontend router now share permission constants from
  `@mosehxl/types`,
- SSOT drift for audited router permission literals is removed,
- type safety and runtime behavior remain stable.
