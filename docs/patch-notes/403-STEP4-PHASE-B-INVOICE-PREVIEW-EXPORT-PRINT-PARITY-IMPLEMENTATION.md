# 403 - Step 4 / Phase B: invoice preview-export-print legal parity - Implementation

Date: 2026-05-28  
Plan reference: `docs/patch-notes/402-STEP4-PHASE-B-INVOICE-PREVIEW-EXPORT-PRINT-PARITY-PLAN.md`

---

## 1) Delivered in this phase

Phase B was delivered to align legal invoice information across:

1. invoice dialog preview,
2. invoice export payload,
3. invoice thermal print payload.

The invoice UI now collects Phase A legal fields and sends them in API requests.

---

## 2) Files changed

### Frontend

1. `MuseBar/src/components/POS/PrintAfterSaleDialog.tsx`
   - Added legal invoice inputs:
     - due date,
     - payment terms,
     - late penalty terms,
     - recovery fee note,
     - seller legal form (optional),
     - seller share capital (optional).
   - Sends legal block in invoice creation payload.
   - Adds local validation before submit.
   - Synchronizes form from existing invoice when idempotent fetch returns existing row.
   - Passes legal info to preview component for invoice mode.

2. `MuseBar/src/components/Legal/LegalReceipt/types.ts`
   - Added `InvoiceLegalInfo` type and preview props wiring.

3. `MuseBar/src/components/Legal/LegalReceipt/LegalReceiptContainer.tsx`
   - Propagates invoice legal info to footer.

4. `MuseBar/src/components/Legal/LegalReceipt/ReceiptFooter.tsx`
   - Renders “Mentions légales facture” section in invoice mode.

### Backend

1. `MuseBar/backend/src/services/printing/types.ts`
   - Added `legal_info` shape in print payload type.

2. `MuseBar/backend/src/printing/printDataRepo.ts`
   - Maps legal invoice fields from `legal_invoices` into `legal_info` for print payload.

3. `MuseBar/backend/src/services/printing/eposPrintXml.ts`
   - Extends invoice thermal XML output with legal invoice mentions:
     - due date,
     - payment terms,
     - late penalties,
     - recovery fee note,
     - legal form,
     - share capital.

4. `MuseBar/backend/src/services/printing/eposPrintXml.receiptParity.test.ts`
   - Added invoice-specific parity test asserting legal markers in XML output.

---

## 3) Behavior before vs after

### Before

1. Invoice dialog did not provide legal fields required by Phase A.
2. Preview did not show invoice legal mentions.
3. Thermal invoice payload did not include Phase A legal fields.

### After

1. Invoice dialog collects and sends legal fields.
2. Invoice preview shows legal mentions block.
3. Thermal invoice payload includes legal mentions for parity with export/preview intent.

---

## 4) Verification evidence

Executed:

1. `npm run test --workspace MuseBar/backend -- src/services/printing/eposPrintXml.receiptParity.test.ts` ✅
2. `npm run test --workspace MuseBar/backend -- src/routes/legal/invoices.routes.test.ts` ✅
3. `npm run type-check --workspace MuseBar` ✅
4. `npm run lint --workspace MuseBar` ✅ (warnings only, pre-existing unrelated warnings)

---

## 5) Residual scope

Still planned in later phases:

1. SQL compliance verification script and runbook (Phase D).
2. Full UAT matrix and evidence checklist (Phase E).
