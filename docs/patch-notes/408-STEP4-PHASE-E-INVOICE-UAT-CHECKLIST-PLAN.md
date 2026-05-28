# 408 - Step 4 / Phase E: invoice functional UAT checklist (POS + History) - Plan

Date: 2026-05-28  
Parent roadmap: `docs/patch-notes/399-STEP4-INVOICE-100-COMPLIANCE-ROADMAP.md`

---

## 1) Goal of this phase

Finalize operator-level acceptance for invoice flows.

This phase delivers a practical checklist to validate:

1. POS invoice flow,
2. History invoice flow,
3. idempotent invoice behavior,
4. legal safeguard error paths.

---

## 2) Scope

### In scope

1. Create a beginner-friendly UAT checklist runbook:
   - prerequisites,
   - POS scenarios,
   - History scenarios,
   - error-path scenarios,
   - expected results.
2. Include evidence capture instructions to make audits/reviews easier.
3. Create implementation patch-note for traceability.

### Out of scope

1. New code changes in invoice backend/frontend (already handled in Phases A-D).
2. Fiscal legal reinterpretation beyond previously agreed compliance target.

---

## 3) Checklist design principles

1. Every test case has:
   - purpose,
   - steps,
   - expected result.
2. Include both success and failure paths.
3. Keep wording clear for junior operators.
4. Make execution evidence easy to archive.

---

## 4) Scenarios to include

1. POS - create detailed invoice, export, print.
2. POS - create summary invoice, export, print.
3. History - same scenarios as POS.
4. Idempotency - same order should reuse existing invoice number.
5. Safeguards - missing legal fields/seller identity blocks creation/export/print with actionable guidance.
6. Optional parity checks - legal mentions visible across preview/export/thermal print output class.

---

## 5) Acceptance criteria

1. UAT checklist covers all roadmap Phase E requirements.
2. Checklist can be executed without tribal knowledge.
3. Evidence format is clear enough for internal review.
4. Documentation is beginner-friendly and versioned in patch notes.
