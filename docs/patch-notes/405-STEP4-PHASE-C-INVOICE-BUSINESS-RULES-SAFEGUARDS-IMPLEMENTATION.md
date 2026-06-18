# 405 - Step 4 / Phase C: invoice business rules and safeguards - Implementation

Date: 2026-05-28  
Plan reference: `docs/patch-notes/404-STEP4-PHASE-C-INVOICE-BUSINESS-RULES-SAFEGUARDS-PLAN.md`

---

## 1) What was delivered

Phase C was implemented to block non-compliant invoices from finalization flows (export/print).

Delivered safeguards:

1. Compliance validation helper logic in invoice route.
2. Existing invoice fetch now validated before return.
3. Seller identity validation before new invoice creation.
4. Invoice print/preview pipeline blocked when mandatory legal fields are missing.
5. Actionable, beginner-friendly error messages with remediation guidance.

---

## 2) Files changed

### Backend routes and repositories

1. `MuseBar/backend/src/routes/legal/invoices.ts`
   - Added helpers:
     - `getMissingSellerIdentityFields(...)`
     - `getMissingLegalInvoiceFields(...)`
     - `assertPersistedInvoiceCompliance(...)`
   - Existing invoice idempotent return now enforces compliance checks.
   - New invoice generation now enforces seller identity checks from business snapshot.
   - Error messages now explicitly guide operators to `Settings > Establishment`.

2. `MuseBar/backend/src/printing/printDataRepo.ts`
   - `buildReceiptDataForInvoice(...)` now rejects non-compliant invoices with `statusCode: 422` when:
     - legal fields are missing,
     - seller identity fields are missing.

3. `MuseBar/backend/src/routes/printing.ts`
   - Invoice preview/print routes map repository `422` compliance errors to validation responses (`400`).

### Tests

1. `MuseBar/backend/src/routes/legal/invoices.routes.test.ts`
   - Added coverage:
     - block existing invoice export when legal fields are missing,
     - block invoice creation when seller identity is incomplete.
   - Updated mocks for new safeguard flow.

2. `MuseBar/backend/src/routes/printing.routes.test.ts`
   - Added coverage for invoice print compliance block path.

### Documentation

1. `docs/patch-notes/404-STEP4-PHASE-C-INVOICE-BUSINESS-RULES-SAFEGUARDS-PLAN.md` (new)
2. `docs/patch-notes/405-STEP4-PHASE-C-INVOICE-BUSINESS-RULES-SAFEGUARDS-IMPLEMENTATION.md` (new)

---

## 3) Behavior before vs after

### Before

1. Existing invoices could be returned/exported without strong compliance guardrails.
2. Print path did not explicitly block invoice finalization when legal/seller fields were missing.
3. Guidance messages were less explicit for operators.

### After

1. Non-compliant invoices are blocked from export/print finalization.
2. Missing seller legal identity also blocks finalization.
3. Operators receive explicit “what is missing” + “where to fix” guidance.

---

## 4) Verification evidence

Executed:

1. `npm run test --workspace MuseBar/backend -- src/routes/legal/invoices.routes.test.ts` ✅
2. `npm run test --workspace MuseBar/backend -- src/routes/printing.routes.test.ts` ✅
3. `npm run type-check --workspace MuseBar` ✅
4. `npm run lint --workspace MuseBar` ✅ (warnings only, pre-existing and unrelated)

---

## 5) Residual scope

Next planned:

1. Phase D - SQL verification script + compliance runbook.
2. Phase E - full UAT matrix and validation checklist.
