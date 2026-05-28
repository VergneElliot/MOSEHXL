# 406 - Step 4 / Phase D: invoice verification scripts and runbook - Plan

Date: 2026-05-28  
Parent roadmap: `docs/patch-notes/399-STEP4-INVOICE-100-COMPLIANCE-ROADMAP.md`

---

## 1) Goal of this phase

Provide a repeatable verification toolkit to check invoice compliance quickly.

This phase adds:

1. a SQL verification script (database truth),
2. a beginner-friendly runbook (how to execute and interpret results).

---

## 2) Scope

### In scope

1. SQL checks for:
   - numbering continuity,
   - uniqueness sanity,
   - hash-chain consistency,
   - required legal field presence,
   - seller legal identity presence,
   - immutable-table smoke check guidance.
2. Runbook with exact commands and pass/fail interpretation.
3. Implementation patch-note documenting what landed.

### Out of scope

1. New business logic changes (already handled in prior phases).
2. Full UAT matrix (Phase E).

---

## 3) Script design

The SQL script must be readable and beginner-friendly:

1. each section checks one rule only,
2. each query returns only anomalies,
3. empty result = pass for that section.

Target checks:

1. Duplicate invoice numbers in same establishment.
2. Duplicate `(establishment_id, invoice_year, invoice_sequence)`.
3. Sequence gaps by establishment/year.
4. Missing `invoice_hash` / legal invoice fields.
5. Hash-chain mismatch (`previous_invoice_hash` does not point to prior invoice hash).
6. Missing seller identity in business snapshot.

---

## 4) Runbook design

Runbook should include:

1. prerequisites (`psql`, DB env),
2. exact command to run script,
3. what “pass” looks like,
4. what to do when a section fails.

---

## 5) Acceptance criteria

1. Script executes successfully against local DB.
2. Script outputs are self-explanatory.
3. Runbook allows a junior dev/operator to run checks without guessing.
4. Phase docs and git history clearly track this delivery.
