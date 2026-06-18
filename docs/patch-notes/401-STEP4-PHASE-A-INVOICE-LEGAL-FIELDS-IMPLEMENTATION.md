# 401 - Step 4 / Phase A: invoice legal fields completion - Implementation

Date: 2026-05-28  
Plan reference: `docs/patch-notes/400-STEP4-PHASE-A-INVOICE-LEGAL-FIELDS-PLAN.md`

---

## 1) What was delivered

Phase A was completed with schema + API legal contract hardening for invoices.

Delivered:

1. New migration adding legal B2B invoice fields.
2. Invoice create route contract updated to require legal metadata.
3. Legal metadata included in invoice hash payload.
4. Tests updated with new payload requirements + validation coverage.

---

## 2) Files changed

### Backend migration

1. `MuseBar/backend/src/migrations/files/2026_05_28_21_15_00_add_invoice_legal_fields.sql` (new)
   - Added columns on `legal_invoices`:
     - `payment_due_date` (required),
     - `payment_terms` (required),
     - `late_penalty_terms` (required),
     - `recovery_fee_note` (required),
     - `seller_legal_form` (optional),
     - `seller_share_capital_eur` (optional, non-negative).
   - Backfill for existing invoices before `NOT NULL` enforcement.

### Backend routes/tests

1. `MuseBar/backend/src/routes/legal/invoices.ts`
   - Added legal payload parsing (`legal.*`).
   - Added validation:
     - `payment_due_date` required + `YYYY-MM-DD`,
     - `payment_terms` required,
     - `late_penalty_terms` required,
     - `seller_share_capital_eur` numeric and `>= 0` when provided.
   - Added default recovery fee sentence when missing.
   - Extended hash payload with legal fields.
   - Kept idempotent behavior: existing invoice by order returns `200` without generating a new sequence.

2. `MuseBar/backend/src/routes/legal/invoices.routes.test.ts`
   - Updated success fixtures with legal payload.
   - Added test for missing mandatory legal fields.
   - Adjusted mocks for early “existing invoice” check.

### Documentation

1. `docs/patch-notes/400-STEP4-PHASE-A-INVOICE-LEGAL-FIELDS-PLAN.md` (new)
2. `docs/patch-notes/401-STEP4-PHASE-A-INVOICE-LEGAL-FIELDS-IMPLEMENTATION.md` (new)

---

## 3) API payload update (important)

Invoice creation now expects:

```json
{
  "mode": "detailed",
  "customer": {
    "name": "Client B2B",
    "address": "12 Avenue de Lyon",
    "email": "facturation@client.fr",
    "tax_identification": "FRXX999999999"
  },
  "legal": {
    "payment_due_date": "2026-06-30",
    "payment_terms": "Paiement à 30 jours",
    "late_penalty_terms": "Pénalités au taux BCE + 10 points",
    "recovery_fee_note": "Indemnité forfaitaire de recouvrement: 40 EUR (C. com. art. L441-10)",
    "seller_legal_form": "SARL",
    "seller_share_capital_eur": 10000
  }
}
```

---

## 4) Verification evidence

Executed and passing:

1. `npm run migration:migrate --workspace MuseBar/backend` ✅
2. `npm run test --workspace MuseBar/backend -- src/routes/legal/invoices.routes.test.ts` ✅
3. `npm run type-check --workspace MuseBar` ✅
4. `npm run lint --workspace MuseBar` ✅ (warnings only, pre-existing and unrelated)

---

## 5) Behavior before vs after

### Before

1. Invoice creation only validated customer identity.
2. No dedicated legal payment metadata contract.
3. Hash payload did not include legal payment fields.

### After

1. Invoice creation enforces legal metadata presence and format.
2. Legal fields are persisted in `legal_invoices`.
3. Legal fields are included in hash computation payload.

---

## 6) Residual scope (next phase)

Still planned for next phases:

1. Full preview/export/thermal legal mention parity rendering sweep.
2. SQL verification script and compliance runbook.
3. UAT matrix for POS/History with legal edge cases.
