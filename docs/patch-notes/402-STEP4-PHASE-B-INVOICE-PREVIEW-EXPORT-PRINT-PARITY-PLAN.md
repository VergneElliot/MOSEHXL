# 402 - Step 4 / Phase B: invoice preview-export-print legal parity - Plan

Date: 2026-05-28  
Parent roadmap: `docs/patch-notes/399-STEP4-INVOICE-100-COMPLIANCE-ROADMAP.md`

---

## 1) Goal of this phase

Make sure invoice legal fields are visible and consistent in all operator outputs:

1. invoice preview in dialog,
2. invoice export payload,
3. invoice thermal print payload.

This phase closes the parity gap introduced after Phase A schema/API hardening.

---

## 2) Scope

### In scope

1. Extend invoice dialog UI with Phase A legal fields.
2. Send legal fields in invoice creation API payload.
3. Show legal fields in invoice preview area.
4. Ensure thermal print XML contains legal invoice mentions.
5. Add focused tests for invoice XML legal markers.

### Out of scope

1. SQL verification script (Phase D).
2. Full UAT matrix (Phase E).

---

## 3) Implementation approach

### 3.1 Frontend dialog contract

In `PrintAfterSaleDialog`:

1. add legal field inputs:
   - due date,
   - payment terms,
   - late penalty terms,
   - recovery fee note,
   - optional seller legal form/capital.
2. include these fields in `POST /api/legal/invoices/from-order/:orderId` payload under `legal`.
3. pass legal fields to preview component when `documentKind = invoice`.

### 3.2 Preview rendering

In legal receipt components:

1. add an invoice legal info section displayed only for invoices,
2. keep ticket rendering unchanged,
3. preserve beginner-readable labels.

### 3.3 Thermal print parity

In backend print mapping and ePOS XML:

1. map invoice legal fields from `legal_invoices` to printing data,
2. print these fields in invoice output block,
3. keep ticket output unchanged.

---

## 4) Acceptance criteria

1. Invoice creation from dialog succeeds with legal fields provided.
2. Invoice preview displays legal payment mentions.
3. Exported invoice JSON includes legal fields.
4. Thermal invoice XML includes legal fields.
5. Tests and checks pass.

---

## 5) Verification plan

Automated:

1. `npm run test --workspace MuseBar/backend -- src/services/printing/eposPrintXml.receiptParity.test.ts`
2. `npm run test --workspace MuseBar/backend -- src/routes/legal/invoices.routes.test.ts`
3. `npm run type-check --workspace MuseBar`
4. `npm run lint --workspace MuseBar`

Manual:

1. POS -> invoice detailed/summary preview -> confirm legal fields visible.
2. Export invoice -> confirm legal fields in JSON.
3. Print invoice -> confirm backend accepts and queues.
