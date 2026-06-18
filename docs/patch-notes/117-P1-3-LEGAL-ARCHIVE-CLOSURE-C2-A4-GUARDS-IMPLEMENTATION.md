# 117 - P1-3 (Legal Archive/Closure C2 + A4 Guard Verification) - Implementation

Date: 2026-04-29  
Related plan: `docs/patch-notes/116-P1-3-LEGAL-ARCHIVE-CLOSURE-C2-A4-GUARDS-PLAN.md`

## What was implemented

## 1) C2 error-flow alignment in remaining legal perimeter files

Updated:
- `MuseBar/backend/src/routes/legal/archive.ts`
- `MuseBar/backend/src/routes/legal/closure.ts`

Changes:
- Added `Logger` usage (`logger.error(...)`) for server-failure paths.
- Converted route handlers to `asyncHandler(...)`.
- Replaced ad-hoc `process.stderr` + inline 500 responses with `throw new AppError(...)` and route-specific error codes.
- Kept existing validation and semantic status responses unchanged (`400`, `404`, `409` where already intentional).

## 2) A4 guard verification tests for closure/archive permission gate

Added:
- `MuseBar/backend/src/routes/legal/legalArchiveClosure.permissions.test.ts`

Coverage:
1. `/archive/list` returns `403` without `access_closure`.
2. `/archive/list` succeeds with `access_closure`.
3. `/closure/bulletins` returns `403` without `access_closure`.

This locks the existing `router.use(requireAuth, requirePermission(P.access_closure))` behavior with regression coverage.

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/routes/legal/legalArchiveClosure.permissions.test.ts src/routes/legal/legalPermissionGates.test.ts` ✅
   - Result: 2 files passed, 7 tests passed.

2. `npm run type-check` ✅
   - Result: TypeScript no-emit check passed.

3. Lints check (edited files) ✅
   - No linter errors on:
     - `archive.ts`
     - `closure.ts`
     - `legalArchiveClosure.permissions.test.ts`

## Outcome

P1-3 is complete:
- Remaining legal perimeter route files touched in this patch now follow centralized C2 error handling conventions.
- `access_closure` A4 gate on archive/closure surfaces is explicitly covered by regression tests.
