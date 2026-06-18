# 172 - P0-L1 (Order Payment Journal Fail-Safe Parity) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (L1)

## Why this patch exists

The April 29 full audit confirmed a critical legal-compliance gap:

- `POST /api/orders` (SALE flow) is fail-safe after P0-2.
- But `POST /api/orders/payment/change` and `POST /api/orders/payment/cancel-unified`
  still allow a successful API response even when legal-journal persistence fails.

This is dangerous because it can persist economic operations (change, cancellation, tip reversal)
without their required legal journal entries.

For French fiscal posture, these flows must match SALE policy: **no success response if journal write fails**.

## Beginner-friendly problem framing

Think of each operation as a receipt lifecycle:

1. We create accounting rows (`orders`, `order_items`, `sub_bills`).
2. We append immutable legal evidence (`legal_journal`).
3. Only then can we tell the client "success".

Current payment routes do step 1, then *try* step 2, but if step 2 fails they only log and still return 201.
This patch enforces strict coupling:

- If legal journal append fails, we must return 500.
- We must also attempt cleanup of the created order rows (compensating delete) to avoid dangling data.

## Scope

### In scope

1. Harden `orderChange`:
   - if `LegalJournalModel.logChange(...)` fails, attempt `OrderModel.delete(...)`,
   - return 500 (no success response).
2. Harden `orderCancel` in both legal-write points:
   - change-cancellation branch (`isChangeOperation` + `logChange`),
   - normal cancellation branch (`addEntry('REFUND', ...)`) and tip reversal `logChange`.
3. Add regression tests for fail-safe behavior in payment routes.
4. Keep route contracts unchanged on success paths.
5. Document implementation and verification.

### Out of scope

- Full single-client DB transaction rewrite across all operations.
- Refactor all payment routes to `asyncHandler + AppError` in this same patch.
- Any archive / software-events / closure-stream items from the audit (separate patches).

## Design choices

1. **Policy parity over architecture rewrite**
   - We apply the same fail-safe contract as P0-2 immediately.
   - This gives compliance safety now without waiting for a larger transaction refactor.

2. **Compensating delete strategy**
   - Use existing `OrderModel.delete(orderId, establishmentId)` cleanup.
   - Because route code currently writes rows through `OrderModel`, we keep the same model boundary.

3. **Fail closed**
   - On legal write failure: return 500 and stop.
   - Audit writes remain non-blocking and should only happen after legal success.

4. **Minimal blast radius**
   - Only payment route branches that currently swallow legal-journal errors are changed.
   - No API payload redesign.

## Detailed implementation strategy

### Step 1 - Harden `/payment/change`

File: `MuseBar/backend/src/routes/orders/orderChange.ts`

Plan:
- Replace "log-only" journal catch with strict failure handling.
- On `logChange` failure:
  1. log legal-journal error,
  2. attempt `OrderModel.delete(createdOrder.id, establishmentId)`,
  3. log cleanup failure if any,
  4. return HTTP 500 with explicit legal-journal failure message.
- Ensure audit trail write is not executed on this failure path.

### Step 2 - Harden `/payment/cancel-unified` change-cancellation branch

File: `MuseBar/backend/src/routes/orders/orderCancel.ts`

Plan:
- In `isChangeOperation` path:
  - if `logChange` fails for `reversalOrder`,
    - attempt compensating delete of `reversalOrder`,
    - return 500.
- Keep existing success payload unchanged when legal write succeeds.

### Step 3 - Harden `/payment/cancel-unified` normal cancellation branch

File: `MuseBar/backend/src/routes/orders/orderCancel.ts`

Plan:
- Add small local helper (route-local) to cleanup created orders by id with robust logging.
- Track created order ids:
  - `cancellationOrder.id`,
  - optional `tipReversalOrder.id` if created.
- If tip-reversal journal `logChange` fails:
  - attempt cleanup of tip reversal and cancellation orders,
  - return 500.
- If main REFUND `addEntry` fails:
  - attempt cleanup of created orders,
  - return 500.
- Only after legal success:
  - continue to audit log and response.

### Step 4 - Regression tests

Add file:
- `MuseBar/backend/src/routes/orders/orderPayment.journalFailSafe.test.ts`

Coverage:
1. `POST /orders/payment/change`
   - legal journal failure => 500 + compensating delete called.
2. `POST /orders/payment/cancel-unified` for change-operation cancellation path
   - `logChange` failure => 500 + compensating delete called.
3. `POST /orders/payment/cancel-unified` for normal cancellation path
   - REFUND journal failure => 500 + compensating delete called for created cancellation order.
4. Optional tip reversal case:
   - tip reversal `logChange` failure => 500 + cleanup attempts.

### Step 5 - Verify

Run:
- targeted tests (new payment fail-safe file + existing order fail-safe file),
- backend type-check,
- lint diagnostics for edited files.

## Acceptance criteria

1. No payment change/cancellation endpoint returns 201 when legal journal write fails.
2. Compensating delete is attempted on all newly created orders in legal failure paths.
3. Regression tests prove fail-safe behavior.
4. Existing success contracts remain intact.
5. Plan + implementation patch notes are added.

## Risk notes and mitigations

- Risk: partial cleanup if one delete fails.
  - Mitigation: best-effort cleanup across all tracked order ids, each error logged separately, then fail 500.
- Risk: route complexity increases.
  - Mitigation: keep helper local and focused; no broad refactor in this patch.
- Risk: hidden test fragility from auth permission queries.
  - Mitigation: explicit pool query mocks for token blocklist + permission lookup.
