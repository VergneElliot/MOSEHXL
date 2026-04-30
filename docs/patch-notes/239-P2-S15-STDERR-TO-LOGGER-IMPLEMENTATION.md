# 239 - P2-S15 (stderr to structured logger) - Implementation

Date: 2026-05-01  
Plan reference: `docs/patch-notes/238-P2-S15-STDERR-TO-LOGGER-PLAN.md`

## What was implemented

This patch closes P2-S15 by replacing remaining direct `process.stderr.write(...)`
error paths with structured logger helper calls.

## 1) Replaced stderr write in business-day stats route

Updated:
- `MuseBar/backend/src/routes/legal/businessDayStats.ts`

Changes:
1. Imported `logError` from logger utility.
2. Replaced direct stderr write in catch block with:
   - `logError('Error fetching business day stats', error)`

Result:
- route now reports failures through structured logging while keeping same HTTP
  500 response behavior.

## 2) Replaced stderr write in audit trail model

Updated:
- `MuseBar/backend/src/models/auditTrail.ts`

Changes:
1. Imported `logError` from logger utility.
2. Replaced direct stderr write in `logAction(...)` catch block with:
   - `logError('[AUDIT LOG] Error logging action', err)`

Result:
- audit persistence failures now flow through structured logging and still rethrow.

## 3) Test compatibility hardening (existing legal tests)

Updated:
- `MuseBar/backend/src/routes/legal/businessDayStats.permissions.test.ts`
- `MuseBar/backend/src/routes/legal/legalPermissionGates.test.ts`

Reason:
- Added local `permissions/registry` mocks so these route tests run in isolated
  test context where workspace package resolution for `@mosehxl/types` can fail.

## Verification

Executed:

1. Targeted backend tests:
   - `npm run test -- src/routes/legal/businessDayStats.permissions.test.ts src/routes/legal/legalPermissionGates.test.ts`
   - Result: passed (2 files, 20 tests).
2. Backend type-check:
   - `npm run type-check`
   - Result: passed.
3. Lint diagnostics on touched files:
   - Result: no lint errors.

## Outcome

P2-S15 is complete:
- targeted stderr writes are replaced by structured logger helper usage,
- runtime behavior remains unchanged,
- legal route regression tests continue passing in isolated execution.
