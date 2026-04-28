# 101 - P0-2 (Order + Legal Journal Fail-Safe Policy) - Implementation

Date: 2026-04-28  
Related plan: `docs/patch-notes/100-P0-2-ORDER-LEGAL-JOURNAL-FAIL-SAFE-POLICY-PLAN.md`

## What was implemented

## 1) Hardened completed-sale order creation policy

Updated:
- `MuseBar/backend/src/routes/orders/orderCRUD.ts`

Changes:
- Replaced fire-and-forget legal journal write in completed-sale branch with awaited write:
  - before: `LegalJournalModel.logTransaction(...).catch(...)`
  - after: `await LegalJournalModel.logTransaction(...)` inside a try/catch block.
- On legal journal failure:
  1. logs the legal journal error,
  2. attempts compensating delete via `OrderModel.delete(order.id, establishmentId)`,
  3. logs cleanup failure if delete fails or throws,
  4. returns HTTP 500 with compliance-safe error message.
- Audit log write remains in the completed-sale success path only (not executed when journal fails).

Intent:
- prevent successful API response for completed sales that failed legal journal persistence.

## 2) Added regression tests for fail-safe behavior

Added:
- `MuseBar/backend/src/routes/orders/orderCRUD.journalFailSafe.test.ts`

Test coverage:
1. **Completed order + SALE journal failure**
   - expects HTTP 500,
   - expects compensating `OrderModel.delete(...)` call,
   - expects no audit write call.
2. **Pending order**
   - expects HTTP 201,
   - expects no SALE journal call,
   - expects no compensating delete.

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/routes/orders/orderCRUD.journalFailSafe.test.ts src/routes/orders/orderCRUD.establishmentIsolation.test.ts` ✅
   - Result: 2 files passed, 3 tests passed.

2. `npm run type-check` ✅
   - Result: TypeScript no-emit check passed.

3. Lints check (edited files) ✅
   - No linter errors on:
     - `orderCRUD.ts`
     - `orderCRUD.journalFailSafe.test.ts`

## Outcome

P0-2 is now implemented as fail-safe policy hardening:
- completed-sale API success is now coupled to successful SALE journal persistence,
- compensating delete is attempted when journal persistence fails,
- behavior is guarded by route-level regression tests.

Follow-up:
- A future deeper pass can still migrate this flow to one explicit DB transaction (single client) for stronger atomic guarantees across order/items/sub-bills/journal writes.
