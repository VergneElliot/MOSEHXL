# 404 - Step 4 / Phase C: invoice business rules and safeguards - Plan

Date: 2026-05-28  
Parent roadmap: `docs/patch-notes/399-STEP4-INVOICE-100-COMPLIANCE-ROADMAP.md`

---

## 1) Goal of this phase

Prevent non-compliant invoices from being exported or printed.

In simple terms:

1. Detect incomplete invoice legal metadata.
2. Detect missing seller legal identity fields.
3. Block export/print when requirements are not met.
4. Return actionable operator messages explaining exactly what to fix.

---

## 2) Scope

### In scope

1. Add backend compliance validation helpers in invoice flow.
2. Apply safeguards for:
   - existing invoice fetch (export path),
   - invoice print/preview path.
3. Add clear user-facing validation messages.
4. Add route tests for blocked non-compliant cases.

### Out of scope

1. SQL verification script (Phase D).
2. Full UAT checklist (Phase E).

---

## 3) Safeguards to enforce

### 3.1 Mandatory legal metadata

Required:

1. `payment_due_date`
2. `payment_terms`
3. `late_penalty_terms`
4. `recovery_fee_note`

If any missing -> block invoice export/print.

### 3.2 Seller legal identity consistency

Required seller identity fields in invoice business snapshot:

1. business name,
2. business address,
3. business SIRET,
4. business VAT identification.

If any missing -> block invoice export/print and guide user to Settings.

---

## 4) Error message strategy

All blocking messages should be:

1. explicit about missing fields,
2. explicit about action to take,
3. beginner-friendly.

Example style:

`Invoice compliance blocked: missing seller identity fields (...). Complete Settings > Establishment legal identity fields before generating invoices.`

---

## 5) Verification plan

Automated:

1. `npm run test --workspace MuseBar/backend -- src/routes/legal/invoices.routes.test.ts`
2. `npm run test --workspace MuseBar/backend -- src/routes/printing.routes.test.ts`
3. `npm run type-check --workspace MuseBar`
4. `npm run lint --workspace MuseBar`

Manual quick checks:

1. Try exporting/printing invoice with missing legal fields -> blocked.
2. Try exporting/printing invoice with missing seller identity fields -> blocked with guidance.

---

## 6) Acceptance criteria

1. Incomplete legal data cannot be exported/printed as final invoice.
2. Missing seller legal identity blocks invoice finalization.
3. Operators get actionable error guidance.
4. No type-check/lint regressions in touched files.
