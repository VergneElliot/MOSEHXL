# 400 - Step 4 / Phase A: invoice legal fields completion - Plan

Date: 2026-05-28  
Parent roadmap: `docs/patch-notes/399-STEP4-INVOICE-100-COMPLIANCE-ROADMAP.md`

---

## 1) Goal of this phase

Complete the **invoice legal metadata contract** at schema and API level.

In plain words:

1. Add missing mandatory legal fields for French B2B invoice handling.
2. Store them in `legal_invoices`.
3. Validate them at invoice creation time with clear error messages.
4. Include these fields in invoice hash payload for legal traceability.

This phase does not yet redesign the full preview layout (that belongs to next phases).

---

## 2) Scope

### In scope

1. New DB migration to add invoice legal fields.
2. Backend invoice route contract update (`POST /api/legal/invoices/from-order/:orderId`).
3. Validation rules for legal fields.
4. Hash payload update with legal fields.
5. Route tests update + new validation tests.

### Out of scope

1. UI redesign of invoice legal section.
2. Full thermal/preview legal mention parity sweep (next phase).
3. SQL verification script (Phase D).

---

## 3) Legal fields targeted in this phase

Mandatory for invoice creation:

1. `payment_due_date` (date)
2. `payment_terms` (text)
3. `late_penalty_terms` (text)

Mandatory with default fallback:

1. `recovery_fee_note` (text, default legal sentence for 40 EUR B2B recovery fee)

Optional:

1. `seller_legal_form` (text)
2. `seller_share_capital_eur` (number >= 0)

---

## 4) Technical plan

### 4.1 Migration

Add columns to `legal_invoices`:

1. legal payment fields
2. legal company identity extensions

Backfill strategy:

1. Existing rows get safe fallback values.
2. Then `NOT NULL` constraints are applied where required.

### 4.2 API contract

Expected payload fragment:

```json
{
  "legal": {
    "payment_due_date": "YYYY-MM-DD",
    "payment_terms": "...",
    "late_penalty_terms": "...",
    "recovery_fee_note": "...",
    "seller_legal_form": "...",
    "seller_share_capital_eur": 10000
  }
}
```

Validation:

1. clear `400` errors when required legal fields are missing/invalid.
2. numeric check for `seller_share_capital_eur`.

### 4.3 Hash chain

Invoice hash input is extended with legal fields so legal metadata is part of immutable signed payload.

---

## 5) Acceptance criteria

1. Migration applies successfully.
2. Invoice creation fails on missing mandatory legal fields.
3. Valid payload creates invoice with legal columns populated.
4. Tests cover:
   - success path,
   - missing legal fields path.
5. Type-check/lint/tests pass.

---

## 6) Verification plan

Automated:

1. `npm run test --workspace MuseBar/backend -- src/routes/legal/invoices.routes.test.ts`
2. `npm run type-check --workspace MuseBar`
3. `npm run lint --workspace MuseBar`

Manual quick checks:

1. Create invoice with full legal block -> success.
2. Remove one required legal field -> clear `400` validation error.

---

## 7) Risks and mitigations

1. **Risk:** existing invoices break due to new constraints.  
   **Mitigation:** migration backfill before `NOT NULL`.

2. **Risk:** stricter API blocks existing clients.  
   **Mitigation:** explicit validation errors + clear payload contract in docs.

3. **Risk:** hash mismatch expectations for older rows.  
   **Mitigation:** hash extension applies to newly created invoices only.
