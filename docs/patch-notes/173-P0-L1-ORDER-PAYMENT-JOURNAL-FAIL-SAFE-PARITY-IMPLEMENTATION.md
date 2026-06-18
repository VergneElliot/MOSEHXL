# 173 - P0-L1 (Order Payment Journal Fail-Safe Parity) - Implementation

Date: 2026-04-29  
Related plan: `docs/patch-notes/172-P0-L1-ORDER-PAYMENT-JOURNAL-FAIL-SAFE-PARITY-PLAN.md`

## What was implemented

This patch enforces SALE-style fail-safe policy for payment operations that were previously "best effort" on legal-journal writes.

---

## 1) Hardened `/api/orders/payment/change` (cash register change)

Updated:
- `MuseBar/backend/src/routes/orders/orderChange.ts`

Changes:
- Replaced swallow-and-continue legal-journal catch with strict fail-closed behavior.
- On `LegalJournalModel.logChange(...)` failure:
  1. logs legal-journal error,
  2. attempts compensating delete via `OrderModel.delete(order.id, establishmentId)`,
  3. logs cleanup failure if delete throws,
  4. returns HTTP 500 with explicit legal-journal failure message.
- Audit logging remains on the success path only.

Result:
- Endpoint no longer returns 201 when legal journal persistence fails.

---

## 2) Hardened `/api/orders/payment/cancel-unified` change-cancellation branch

Updated:
- `MuseBar/backend/src/routes/orders/orderCancel.ts`

Changes (change-operation reversal path):
- In `isChangeOperation` branch, when `logChange(...)` fails for reversal order:
  - compensating delete is attempted for reversal order,
  - endpoint returns HTTP 500 with legal-journal failure message,
  - success response is blocked.

Result:
- Change-cancellation operations cannot succeed without legal-journal evidence.

---

## 3) Hardened `/api/orders/payment/cancel-unified` normal cancellation and tip-reversal branches

Updated:
- `MuseBar/backend/src/routes/orders/orderCancel.ts`

Changes:
- Added route-local helper `cleanupCompensatingOrders(establishmentId, orderIds)` for robust cleanup attempts with per-order logging.
- Added tracking of created order IDs (`createdOrderIds`):
  - starts with `cancellationOrder.id`,
  - includes `tipReversalOrder.id` when tip reversal is created.
- On tip-reversal legal-journal failure (`logChange`):
  - cleanup is attempted for all created orders (reverse order to cleanup newest first),
  - endpoint returns HTTP 500.
- On main REFUND legal-journal failure (`addEntry('REFUND', ...)`):
  - cleanup is attempted for all created orders,
  - endpoint returns HTTP 500.
- Audit write remains after legal success only.

Result:
- Cancellation and optional tip-reversal flows now fail closed on legal-journal failure and attempt compensating cleanup.

---

## 4) Added regression tests for payment fail-safe parity

Added:
- `MuseBar/backend/src/routes/orders/orderPayment.journalFailSafe.test.ts`

Coverage:
1. `POST /orders/payment/change`
   - legal journal failure => 500 + compensating delete + no audit write.
2. `POST /orders/payment/cancel-unified` (change-operation cancellation branch)
   - legal journal failure => 500 + compensating delete + no audit write.
3. `POST /orders/payment/cancel-unified` (normal REFUND branch)
   - REFUND legal-journal failure => 500 + compensating delete + no audit write.
4. `POST /orders/payment/cancel-unified` with `includeTipReversal`
   - tip-reversal legal-journal failure => 500 + cleanup of both created orders + no REFUND/audit calls.

---

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/routes/orders/orderPayment.journalFailSafe.test.ts src/routes/orders/orderCRUD.journalFailSafe.test.ts` ✅
   - Result: 2 files passed, 6 tests passed.

2. `npm run type-check` ✅
   - Result: TypeScript no-emit check passed.

3. Lints check (edited files) ✅
   - No linter errors on:
     - `orderChange.ts`
     - `orderCancel.ts`
     - `orderPayment.journalFailSafe.test.ts`
     - `172-P0-L1-...-PLAN.md`

---

## Outcome

P0-L1 is implemented for payment routes:

- change/cancellation flows now use fail-safe legal-journal policy parity with SALE flow,
- successful API responses are blocked when required legal-journal persistence fails,
- compensating cleanup is attempted for created orders on failure paths,
- regressions are covered by dedicated route tests.
