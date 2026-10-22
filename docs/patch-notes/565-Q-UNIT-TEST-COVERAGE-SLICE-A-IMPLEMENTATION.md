# 565 — Q — Unit test coverage Slice A: pure helpers (IMPLEMENTATION)

## Summary

Colocated Vitest unit tests for pure helpers extracted in hygiene 562/563 and related utils. Soft FE coverage ratchet from 1% → **3%** lines/statements (measured ~4.6% after this slice).

Fiscal impact: **PATCH** — tests only.

## Tests added (frontend — 15 files, 68 tests)

- `PaymentDialog/splitBillCore|Totals|Shares|Items|Breakdown.test.ts`
- `Administration/planningDraft.test.ts`, `Planning/planningShiftDraft.test.ts`
- `Closure/closurePreviewTotals.test.ts`
- `Public/publicReservationHours.test.ts`
- `services/api/floorTicketMappers.test.ts`
- `utils/posCartSelection|lineItemNote|formatCurrency|uiPrefs|pinRules.test.ts`

## Tests added (backend — 3 files, 36 tests)

- `models/legalJournal/closureOperationsMath.test.ts`
- `routes/legal/closure/parsers.test.ts`
- `services/orders/orderCancellationValidate.test.ts`

## Verification results

- Frontend new tests: 15 files / 68 passed
- Backend new tests: 3 files / 36 passed
- FE coverage after Slice A: **~4.63%** lines → CI threshold **3%**
- Fiscal impact: PATCH

## Follow-ups

Slices B–E (admin routes, services, FE policies, full CI ratchet) — PLAN 564.
