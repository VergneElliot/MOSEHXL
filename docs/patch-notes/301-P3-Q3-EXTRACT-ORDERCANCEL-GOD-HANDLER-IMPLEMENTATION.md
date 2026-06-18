# 301 — P3-Q3 extract `orderCancel` god handler (implementation)

## What changed

### 1) Added dedicated order cancellation service

Created:

- `MuseBar/backend/src/services/orders/orderCancellationService.ts`

This service now owns the cancellation domain flow previously embedded in the route handler:

- full/partial/items-only cancellation computation
- change-operation cancellation path
- split-payment sub-bill reversal mirroring
- optional tip reversal order generation
- legal journal append and fail-closed behavior
- compensating order cleanup on journal failure
- best-effort audit trail writes

### 2) Slimmed `orderCancel` route into transport layer

Updated:

- `MuseBar/backend/src/routes/orders/orderCancel.ts`

Route responsibilities are now limited to:

- auth/permission middleware
- request body extraction and basic validation
- invoking `OrderCancellationService.cancelUnified(...)`
- response emission and top-level error wrapping

The endpoint path and response contract remain unchanged.

### 3) Preserved fiscal fail-safe semantics

All legal-journal critical failure branches still throw the same AppError codes:

- `ORDER_CANCEL_CHANGE_JOURNAL_FAILED`
- `ORDER_CANCEL_TIP_REVERSAL_JOURNAL_FAILED`
- `ORDER_CANCEL_JOURNAL_FAILED`

This keeps compliance-oriented behavior equivalent to the pre-refactor implementation.

## Verification

- Backend type-check: `npm run type-check` ✅
- Targeted route regression: `npm test -- src/routes/orders/orderPayment.journalFailSafe.test.ts` ✅
- Full backend suite: `npm test` (`51/51` files, `202/202` tests) ✅

## Notes

- This closes `P3-Q3` by removing route-layer business logic from a fiscal critical path and aligning with the existing service-extraction direction (same pattern as prior `P2-Q11` work).
