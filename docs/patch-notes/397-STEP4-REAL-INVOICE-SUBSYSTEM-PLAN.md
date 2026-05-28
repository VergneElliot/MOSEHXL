# 397 - Step 4: Real invoice subsystem (B2B facture track) - Plan

Date: 2026-05-28  
Reference roadmap: `docs/patch-notes/390-FEATURE-RECEIPTS-INVOICES-CLOSURE-PRINTING-PLAN.md` (Step 4)

---

## 1) Goal

Deliver a dedicated **invoice** path (facture B2B) that is no longer a relabeled receipt flow:

- separate invoice identity and numbering,
- dedicated invoice creation endpoint,
- explicit UI boundary between ticket (receipt) and facture (invoice),
- deterministic export payload suitable for accounting workflows.

This step intentionally focuses on a robust MVP foundation and does not claim NF525/LNE certification.

---

## 2) Scope

### In scope

1. Database structures for invoice numbering and storage.
2. Backend route(s) to create invoice from an existing order with customer identity payload.
3. Deterministic invoice numbering per establishment and year.
4. Read endpoints for listing and fetching generated invoices.
5. POS print dialog extension with explicit invoice section and export trigger.
6. Targeted automated tests around invoice route behavior and numbering determinism.
7. Implementation note documenting delivered behavior and residual risks.

### Out of scope (kept for later increments)

1. PDF invoice rendering and branded document layout.
2. Email delivery workflow for invoices.
3. Invoice cancellation/credit-note lifecycle.
4. Full customer master-data module.
5. Thermal printer invoice format.

---

## 3) Design choices

### 3.1 Dedicated persistence model

- Add `legal_invoices` table for invoice document data snapshots.
- Add `legal_invoice_counters` table for yearly sequence generation by establishment.
- Enforce uniqueness:
  - `(establishment_id, invoice_number)` for legal identity,
  - `(establishment_id, order_id)` to avoid duplicate invoices for the same order in this MVP.

### 3.2 Numbering policy

- Format: `FAC-YYYY-NNNNNN`
- Sequence increments atomically in a DB transaction (`SELECT ... FOR UPDATE` on counter row).
- Sequence is independent from receipt sequence and legal journal sale numbering.

### 3.3 Creation payload and data source

- Source fiscal amounts/items from existing order/receipt data builder (journal-linked receipt source).
- Require customer identity at creation:
  - `customer.name`,
  - `customer.address`,
  - optional `customer.email`,
  - optional `customer.tax_identification`.

### 3.4 UI boundary

- Keep receipt preview/print path for tickets.
- Add a dedicated “Facture” block in the dialog with customer fields and explicit action:
  - create invoice,
  - export invoice JSON.

This avoids presenting invoice labels that still call receipt-only routes.

---

## 4) API contract (planned)

1. `POST /api/legal/invoices/from-order/:orderId`
   - Creates invoice from order + customer payload.
2. `GET /api/legal/invoices`
   - Lists invoices with pagination.
3. `GET /api/legal/invoices/:invoiceId`
   - Fetches one invoice by id (establishment-scoped).

Access control:

- authentication required,
- permission gate: `access_pos` (same operator domain as order/receipt flow).

---

## 5) Verification plan

Automated:

1. TypeScript check (`npm run type-check --workspace MuseBar`)
2. Lint check (`npm run lint --workspace MuseBar`)
3. Targeted tests:
   - new invoice route tests,
   - existing printing tests sanity (if impacted).

Manual:

1. Finalize order -> open receipt dialog -> fill invoice customer data.
2. Trigger invoice generation/export.
3. Confirm generated payload includes dedicated invoice number and customer identity.

---

## 6) Risks and mitigations

1. **Risk:** Duplicate invoice creation on concurrent clicks.  
   **Mitigation:** transaction + unique constraint by `(establishment_id, order_id)`.

2. **Risk:** Confusion between receipt and invoice identity.  
   **Mitigation:** explicit UI separation and dedicated backend endpoint family.

3. **Risk:** Incomplete legal lifecycle for invoices (cancel/avoir).  
   **Mitigation:** documented as out-of-scope for this increment; follow-up step required.

---

## 7) Expected outcome

At the end of this step, MOSEHXL has a concrete first-class invoice subsystem foundation:

- dedicated legal invoice storage,
- deterministic numbering,
- dedicated API and UI entry point,
- test-covered deterministic behavior.
