# 255 - P2-Q11 (`orderCRUD` POST service extraction) - Implementation

Date: 2026-05-01  
Related plan: `docs/patch-notes/254-P2-Q11-ORDERCRUD-POST-SERVICE-EXTRACTION-PLAN.md`

## What changed

## 1) Extracted POST create-order workflow into a service

Added:
- `MuseBar/backend/src/services/orders/orderCreationService.ts`

This new service now owns the full create-order workflow that was previously
embedded in the route:

1. compute `total_amount` / `total_tax` from items,
2. create order + items + split sub-bills,
3. execute legal journal SALE write for completed orders,
4. run compensating delete on legal journal failure,
5. emit best-effort audit entry on success.

## 2) Made `orderCRUD` POST route a thin orchestrator

Updated:
- `MuseBar/backend/src/routes/orders/orderCRUD.ts`

Changes:
1. route now delegates to `createOrderWithCompliance(...)`,
2. route keeps existing HTTP behavior:
   - `201` on success,
   - `500` with compliance safety message when legal journal write fails,
3. centralized route-level error mapping (`ORDER_CREATE_FAILED`) remains intact.

## Behavior parity notes

The extraction is structural only; legal and audit semantics were preserved:

1. completed orders still require journal write success,
2. journal failure still triggers compensating delete attempt,
3. audit trail logging remains best-effort (`catch` + logger).

## Verification

Executed:
1. `npm run type-check` (backend) -> pass
2. `npm run test -- src/routes/orders/orderCRUD.journalFailSafe.test.ts` -> pass (`1` file, `2` tests)
3. Lint diagnostics on touched files -> no issues

Note:
- During verification planning, `orderPayment.journalFailSafe.test.ts` still shows
  the existing isolated workspace-resolution issue for `@mosehxl/types` in some
  test contexts. This was unrelated to this extraction and unchanged by this pass.

## Result

P2-Q11 is closed: `orderCRUD` POST no longer holds inline order creation +
compliance + audit orchestration logic; that responsibility now lives in a
dedicated service module.
