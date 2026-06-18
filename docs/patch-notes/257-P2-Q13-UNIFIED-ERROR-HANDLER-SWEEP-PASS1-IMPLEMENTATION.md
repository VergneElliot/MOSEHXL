# 257 - P2-Q13 (unified error handler sweep, pass 1) - Implementation

Date: 2026-05-01  
Related plan: `docs/patch-notes/256-P2-Q13-UNIFIED-ERROR-HANDLER-SWEEP-PASS1-PLAN.md`

## What changed

Pass 1 migrated core route files away from ad-hoc `res.status(500).json(...)`
toward the unified `asyncHandler` + `AppError` pipeline.

Updated routes:

1. `MuseBar/backend/src/routes/settings.ts`
2. `MuseBar/backend/src/routes/legal/businessDayStats.ts`
3. `MuseBar/backend/src/routes/adminDashboard.ts`
4. `MuseBar/backend/src/routes/enhancedEstablishments.ts`
5. `MuseBar/backend/src/routes/setup.ts`
6. `MuseBar/backend/src/routes/establishmentSearch.ts`
7. `MuseBar/backend/src/routes/orders/orderCRUD.ts`
8. `MuseBar/backend/src/routes/orders/orderChange.ts`
9. `MuseBar/backend/src/routes/orders/orderCancel.ts`
10. `MuseBar/backend/src/routes/emailTest.ts`

## Key refactor patterns applied

1. Wrapped async handlers with `asyncHandler`.
2. Replaced ad-hoc 500 JSON responses with `throw new AppError(...)`.
3. Preserved non-500 behavior branches (400/404 business errors).
4. Preserved legal fail-safe compensating-delete flow in order routes while
   routing the final failure through unified error middleware.
5. In `adminDashboard.ts` and `establishmentSearch.ts`, removed runtime
   `import('../app')` pool lookups in favor of `db/pool` imports to align with Q10.

## Test adjustments included

1. `MuseBar/backend/src/routes/settings.softwareEvents.test.ts`
   - added local mock for `permissions/registry` to avoid isolated
     `@mosehxl/types` resolution failure.
2. `MuseBar/backend/src/routes/orders/orderCRUD.journalFailSafe.test.ts`
   - mounted `errorHandler` in the test app.
   - updated assertion to read unified error payload shape.
3. `orderCRUD.ts`
   - ensured route-level catch rethrows `AppError` instances (prevents masking
     compliance fail-safe message).

## Verification

Executed:

1. `npm run type-check` (backend) -> pass
2. `npm run test -- src/routes/orders/orderCRUD.journalFailSafe.test.ts src/routes/settings.softwareEvents.test.ts src/routes/legal/businessDayStats.permissions.test.ts src/routes/enhancedEstablishments.softwareEvents.test.ts` -> pass (`4` files, `7` tests)
3. Lint diagnostics on touched files -> no issues

Route-level ad-hoc 500 JSON scan after pass 1:

Remaining files:
1. `routes/printing.ts`
2. `routes/printingCompat.ts`
3. `routes/establishmentAccountCreation/middleware/validateInvitation.ts`
4. `routes/establishmentAccountCreation/middleware/validateBusinessInfo.ts`

These are intentionally deferred to Q13 pass 2.

## Result

Q13 pass 1 is complete: core route error paths now use unified middleware-based
server error handling with explicit `AppError` codes instead of ad-hoc 500 JSON
responses.
