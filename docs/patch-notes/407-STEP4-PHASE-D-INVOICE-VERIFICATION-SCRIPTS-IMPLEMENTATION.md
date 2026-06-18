# 407 - Step 4 / Phase D: invoice verification scripts and runbook - Implementation

Date: 2026-05-28  
Plan reference: `docs/patch-notes/406-STEP4-PHASE-D-INVOICE-VERIFICATION-SCRIPTS-PLAN.md`

---

## 1) What was delivered

Phase D delivered a repeatable verification toolkit for invoice compliance:

1. SQL anomaly-check script,
2. beginner-friendly execution runbook.

This gives a fast, objective way to validate invoice data integrity after feature changes.

---

## 2) Files created

1. `docs/patch-notes/406-STEP4-PHASE-D-INVOICE-VERIFICATION-SCRIPTS-PLAN.md`
2. `docs/runbooks/INVOICE-COMPLIANCE-VERIFICATION.sql`
3. `docs/runbooks/INVOICE-COMPLIANCE-VERIFICATION.md`
4. `docs/patch-notes/407-STEP4-PHASE-D-INVOICE-VERIFICATION-SCRIPTS-IMPLEMENTATION.md`

---

## 3) SQL checks included

The SQL script verifies:

1. duplicate invoice number in establishment,
2. duplicate year/sequence tuple,
3. sequence gaps by establishment/year,
4. missing mandatory legal fields,
5. missing seller identity in business snapshot,
6. hash-chain mismatch,
7. invalid hash format,
8. immutability trigger presence.

Design principle:

- each section returns anomalies only,
- empty result set means pass for that section.

---

## 4) Runbook included

The runbook provides:

1. prerequisites,
2. exact `psql` commands (DATABASE_URL and PG* env variants),
3. pass/fail interpretation rules,
4. optional immutability smoke test,
5. remediation hints.

---

## 5) Verification evidence for this phase

Phase D delivered documentation/scripts only (no runtime business logic changes).

Sanity checks executed on current codebase while preparing this phase:

1. `npm run test --workspace MuseBar/backend -- src/routes/legal/invoices.routes.test.ts` ✅
2. `npm run test --workspace MuseBar/backend -- src/routes/printing.routes.test.ts` ✅
3. `npm run type-check --workspace MuseBar` ✅
4. `npm run lint --workspace MuseBar` ✅ (pre-existing warnings only)

---

## 6) Next step

Proceed to Phase E:

1. functional UAT checklist execution on POS + History,
2. evidence capture based on this runbook outputs.
