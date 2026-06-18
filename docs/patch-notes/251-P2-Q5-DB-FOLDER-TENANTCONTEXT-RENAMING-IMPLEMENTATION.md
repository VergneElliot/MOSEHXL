# 251 - P2-Q5 (`db` folder naming cleanup) - Implementation

Date: 2026-05-01  
Related plan: `docs/patch-notes/250-P2-Q5-DB-FOLDER-TENANTCONTEXT-RENAMING-PLAN.md`

## What changed

## 1) Moved tenant context to an intent-accurate namespace

Added:
- `MuseBar/backend/src/rls/tenantContext.ts`

Removed:
- `MuseBar/backend/src/db/tenantContext.ts`
- empty directory `MuseBar/backend/src/db/`

Implementation is unchanged (same `AsyncLocalStorage` behavior); only module
location changed to better reflect RLS intent.

## 2) Updated all imports

Updated:
1. `MuseBar/backend/src/app.ts`
   - `./db/tenantContext` -> `./rls/tenantContext`
2. `MuseBar/backend/src/middleware/auth.ts`
   - `../db/tenantContext` -> `../rls/tenantContext`
3. `MuseBar/backend/src/utils/closureScheduler.ts`
   - `../db/tenantContext` -> `../rls/tenantContext`

## Verification

Executed:
1. `npm run type-check` (backend)
   - Result: pass.
2. `npm run test -- src/routes/legal/legalPermissionGates.test.ts`
   - Result: pass (`1` file, `20` tests).
3. Lint diagnostics on touched files
   - Result: no issues.

Note:
- `npm run test -- src/middleware/auth.permission.test.ts` failed in isolated mode
  due to existing workspace package-resolution behavior (`@mosehxl/types`), not
  due to this refactor. This same class of issue is already known in prior passes.

## Result

P2-Q5 is closed: tenant request context is now placed under a clear RLS namespace,
removing the misleading one-file `db` folder artifact without behavior changes.
