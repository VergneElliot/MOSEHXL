# 399 - Step 4: Invoice 100% compliance roadmap (beginner-friendly)

Date: 2026-05-28  
Roadmap parent: `docs/patch-notes/390-FEATURE-RECEIPTS-INVOICES-CLOSURE-PRINTING-PLAN.md` (Step 4)

---

## 1) Why this roadmap exists

We now have a real invoice subsystem (separate numbering, dedicated storage, dedicated creation flow, preview/export/print path).

To claim a **fully compliant B2B invoice flow in France**, we still need a final compliance pass focused on legal invoice mentions and validation rules.

This roadmap lists exactly what remains, in a phased and beginner-friendly way.

---

## 2) Current state (already delivered)

Done and already in code:

1. Dedicated invoice identity (`FAC-YYYY-NNNNNN`) separated from tickets.
2. Dedicated invoice hash chain (`invoice_hash`, `previous_invoice_hash`), separate from ticket hash.
3. Invoice immutability at DB level.
4. Invoice preview/export/print wiring from POS and History dialogs.
5. Invoice modes:
   - with detail,
   - without detail.

Remaining work below focuses on legal completeness and verification automation.

---

## 3) Compliance target (what “100%” means here)

For this project, “100% compliance” means:

1. All mandatory legal mentions for B2B invoices are present in data model and rendered outputs.
2. Validation blocks invoice creation when mandatory legal fields are missing.
3. Preview, export, and thermal print show the same legal content class.
4. Automated checks (SQL + tests) can prove numbering, hash chain, immutability, and legal field presence.

---

## 4) Detailed to-do list / roadmap by phase

### Phase A - Legal fields completion (data model + API)

Goal: complete invoice legal metadata storage.

To do:

1. Add invoice legal fields in DB (new migration), including:
   - payment due date (`due_date`),
   - payment terms text (`payment_terms`),
   - late penalty terms/rate (`late_penalty_terms`),
   - fixed recovery fee mention for B2B (`recovery_fee_note`, default “Indemnité forfaitaire de 40 EUR”),
   - optional company legal form/capital fields if required by business profile.
2. Update invoice create endpoint contract to accept/validate these fields.
3. Keep safe defaults for optional fields and strict checks for mandatory ones.

Acceptance criteria:

1. Migration applies cleanly.
2. Endpoint rejects incomplete legal payload with clear messages.
3. Invoice row stores all legal fields.

---

### Phase B - Rendering parity (preview/export/print)

Goal: legal fields appear everywhere an invoice can be consumed.

To do:

1. Add legal fields to invoice preview UI block.
2. Add legal fields to export payload.
3. Add legal fields to thermal print XML for invoices.
4. Ensure “invoice with detail” and “invoice without detail” both include mandatory legal mentions.

Acceptance criteria:

1. Same legal information class is visible in preview + export + thermal payload.
2. No legal field appears only in one output and missing in others.

---

### Phase C - Business rules and safeguards

Goal: prevent non-compliant invoices from being generated.

To do:

1. Add backend validation helpers for legal invoice requirements.
2. Block print/export when mandatory legal invoice fields are missing.
3. Add user-facing actionable errors (what is missing, where to fix it).
4. Add settings checks to ensure seller legal identity fields are filled (name, address, SIRET, VAT identity when applicable).

Acceptance criteria:

1. Incomplete legal data cannot produce a “final” invoice.
2. Operator receives clear corrective guidance.

---

### Phase D - Automated verification scripts and tests

Goal: make feature verification repeatable and objective.

To do:

1. Add SQL verification script for:
   - invoice numbering continuity by establishment/year,
   - uniqueness constraints,
   - hash chain consistency,
   - immutability trigger behavior.
2. Add backend tests for:
   - required legal fields validation,
   - print/export payload contains legal mentions,
   - with-detail / without-detail invoice output differences.
3. Add a short runbook: “how to certify an invoice batch in local/dev”.

Acceptance criteria:

1. Script output clearly flags pass/fail.
2. Tests fail on legal regressions.

---

### Phase E - Functional UAT checklist (POS + History)

Goal: finalize operator-level acceptance.

To do:

1. Validate full flow from POS:
   - create invoice (detail/no detail),
   - export invoice,
   - print invoice.
2. Validate same from History.
3. Validate idempotent behavior:
   - same order should not create a second invoice number unexpectedly.
4. Validate error paths (missing legal field, missing seller legal identity, etc.).

Acceptance criteria:

1. End-user flow works from both entry points.
2. Legal safeguards are visible and understandable.

---

## 5) Suggested execution order

Recommended order:

1. Phase A (schema + API contract)
2. Phase C (validation safeguards)
3. Phase B (rendering parity)
4. Phase D (scripts/tests)
5. Phase E (UAT)

Reason: secure legal correctness first, then presentation parity, then evidence automation.

---

## 6) Workflow to apply for each phase

For each phase above, keep the usual project workflow:

1. Create a “sub-plan” document for the phase.
2. Implement code changes.
3. Create implementation document (what really landed).
4. Run automated checks and manual checks.
5. Commit and push.

This keeps delivery reviewable, traceable, and beginner-friendly.

---

## 7) Beginner notes (important)

1. “Ticket” and “Invoice” can look similar visually; this is allowed.
2. What matters legally is the **invoice identity + legal mentions + immutability + traceability**.
3. If one mandatory mention is missing, the flow is not “100% compliant” yet.

---

## 8) Immediate next step

Start with **Phase A sub-plan** (schema/API legal fields completion), then proceed phase by phase with the standard workflow.
