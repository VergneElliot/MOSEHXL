# 259 - P2-Q13 (unified error handler sweep, pass 2) - Implementation

Date: 2026-05-01  
Related plan: `docs/patch-notes/258-P2-Q13-UNIFIED-ERROR-HANDLER-SWEEP-PASS2-PLAN.md`

## What changed

Pass 2 closed the remaining Q13 files that still had ad-hoc 500 JSON responses.

Updated files:

1. `MuseBar/backend/src/routes/printing.ts`
2. `MuseBar/backend/src/routes/printingCompat.ts`
3. `MuseBar/backend/src/routes/establishmentAccountCreation/middleware/validateInvitation.ts`
4. `MuseBar/backend/src/routes/establishmentAccountCreation/middleware/validateBusinessInfo.ts`

## Refactor details

### 1) Printing routes

In `printing.ts` and `printingCompat.ts`:
1. integrated `asyncHandler` + `AppError`,
2. preserved explicit 400/404 responses where already modeled,
3. converted fallback 500 branches to thrown `AppError` with route-specific codes.

### 2) Establishment-account-creation middlewares

In both middlewares:
1. retained 400 validation responses,
2. replaced ad-hoc 500 responses with `next(new AppError(...))`,
3. ensured internal failures now flow through global unified error middleware.

## Completion check for Q13

Route-level grep after pass 2:

- query: `res.status(500).json(`
- scope: `backend/src/routes`
- result: **no matches**

This confirms Q13 sweep closure for route-layer ad-hoc 500 responses.

## Verification

Executed:

1. `npm run type-check` (backend) -> pass
2. `npm run test -- src/printing/epsonPollHandler.test.ts src/routes/orders/orderCRUD.journalFailSafe.test.ts src/routes/settings.softwareEvents.test.ts src/routes/legal/businessDayStats.permissions.test.ts` -> pass (`4` files, `9` tests)
3. Lint diagnostics on touched files -> no issues

## Result

P2-Q13 is fully closed across both passes: backend route-level server error paths
now use the unified `asyncHandler` + `AppError` flow instead of ad-hoc 500 JSON
responses.
