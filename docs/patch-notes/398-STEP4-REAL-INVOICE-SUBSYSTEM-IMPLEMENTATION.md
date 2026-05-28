# 398 - Step 4: Real invoice subsystem (B2B facture track) - Implementation

Date: 2026-05-28  
Plan reference: `docs/patch-notes/397-STEP4-REAL-INVOICE-SUBSYSTEM-PLAN.md`

---

## 1) Delivered in this step

Step 4 now introduces a dedicated invoice subsystem foundation instead of reusing receipt semantics:

1. dedicated invoice persistence model,
2. dedicated invoice numbering stream,
3. dedicated legal API endpoints for invoice creation/read,
4. explicit invoice block in POS print dialog for operator-driven creation/export.

This is a true facture path (separate identity) while keeping receipt flow intact.

---

## 2) Files changed

### Backend

- `MuseBar/backend/src/migrations/files/2026_05_28_20_30_00_add_legal_invoices.sql` (new)
  - Adds `legal_invoice_counters`.
  - Adds `legal_invoices`.
  - Adds uniqueness constraints and indexes.

- `MuseBar/backend/src/routes/legal/invoices.ts` (new)
  - Adds:
    - `POST /api/legal/invoices/from-order/:orderId`,
    - `GET /api/legal/invoices`,
    - `GET /api/legal/invoices/:invoiceId`.
  - Uses transactional counter increment (`FOR UPDATE`) to guarantee deterministic numbering.
  - Uses order/receipt fiscal source data from `buildReceiptDataForOrder`.

- `MuseBar/backend/src/routes/legal/index.ts` (updated)
  - Mounts `invoices` router under `/api/legal/invoices`.

- `MuseBar/backend/src/routes/legal/invoices.routes.test.ts` (new)
  - Covers validation, deterministic numbering, and list pagination behavior.

### Frontend

- `MuseBar/src/components/POS/PrintAfterSaleDialog.tsx` (updated)
  - Adds dedicated facture section with customer identity fields.
  - Adds “Créer et exporter facture (.json)” action calling dedicated backend invoice endpoint.
  - Keeps receipt preview/print logic separate from invoice action.

### Documentation

- `docs/patch-notes/397-STEP4-REAL-INVOICE-SUBSYSTEM-PLAN.md` (new)
- `docs/patch-notes/398-STEP4-REAL-INVOICE-SUBSYSTEM-IMPLEMENTATION.md` (new)

---

## 3) Behavior before vs after

### Before

- No dedicated invoice storage or numbering stream.
- UI invoice concept had no dedicated backend route.
- No deterministic invoice export payload path tied to a dedicated invoice identity.

### After

- Invoices are persisted in dedicated table with unique invoice number.
- Invoice numbering follows deterministic per-establishment/year sequence (`FAC-YYYY-NNNNNN`).
- Operators can create/export an invoice from order flow using explicit customer identity inputs.
- Receipt and invoice paths are clearly separated in UI and API.

---

## 4) Verification evidence

Executed:

1. `npm run test --workspace MuseBar/backend -- src/routes/legal/invoices.routes.test.ts` ✅
2. `npm run type-check --workspace MuseBar` ✅
3. `npm run lint --workspace MuseBar` ✅ (warnings only, pre-existing in unrelated backend files)

Additional lint scan on touched files:

- `ReadLints` on changed Step 4 files: no new linter errors.

---

## 5) Residual risks / next increments

1. PDF rendering + emailing is not yet implemented (JSON export only in this increment).
2. One-invoice-per-order uniqueness is intentional for MVP; future credit-note/replace flows will need dedicated lifecycle design.
3. Invoice cancellation/avoir flow is not included yet.
4. Manual end-to-end verification with live data and printer stack remains recommended after migration application.

---

## 6) Compliance positioning

This increment improves legal clarity by separating facture identity from ticket identity.  
It does **not** claim NF525/LNE certification and does not replace remaining legal-compliance backlog items outside Step 4 scope.
