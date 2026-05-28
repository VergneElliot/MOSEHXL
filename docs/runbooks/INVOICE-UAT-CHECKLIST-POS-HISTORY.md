# Invoice UAT Checklist (POS + History)

Date: 2026-05-28  
Phase: Step 4 / Phase E

Use this checklist to validate the end-user invoice flow before sign-off.

---

## 1) Preconditions

Before starting, confirm:

1. backend and frontend are running,
2. DB migrations are up to date,
3. at least one test establishment exists with legal identity fields filled:
   - business name,
   - business address,
   - SIRET,
   - VAT/tax identification,
4. printer queue service is reachable (or mocked if no hardware),
5. at least one order exists with customer info suitable for invoice generation.

Optional but recommended:

```bash
psql "$DATABASE_URL" -f "docs/runbooks/INVOICE-COMPLIANCE-VERIFICATION.sql"
```

---

## 2) Evidence template (fill during execution)

For each test case, record:

1. tester name,
2. date/time,
3. environment (local/dev/staging),
4. order id and expected invoice number,
5. result: PASS / FAIL,
6. screenshot/log reference,
7. notes.

---

## 3) POS flow checks

### E-01 - POS detailed invoice generation

Steps:

1. Finalize an order from POS.
2. In print dialog, select `Facture avec détail`.
3. Fill required customer and legal invoice fields.
4. Trigger invoice creation/preview.

Expected:

1. Invoice is generated without error.
2. Preview shows invoice identity (`FAC-YYYY-NNNNNN` style).
3. Mandatory legal mentions are visible.

### E-02 - POS detailed invoice export

Steps:

1. From the same POS invoice dialog, export invoice.

Expected:

1. Export completes successfully.
2. Exported content includes legal mentions (due date, payment terms, late penalties, recovery fee note).

### E-03 - POS detailed invoice print

Steps:

1. From the same POS invoice dialog, print invoice.

Expected:

1. Print job is queued successfully.
2. Thermal payload corresponds to invoice (not ticket) and includes legal mentions.

### E-04 - POS summary invoice generation/print/export

Steps:

1. Repeat E-01/E-02/E-03 with `Facture sans détail`.

Expected:

1. Summary invoice mode works end-to-end.
2. Legal mentions remain present even when item detail is summarized.

---

## 4) History flow checks

### E-05 - History detailed invoice flow

Steps:

1. Open an eligible order from History.
2. Open print dialog.
3. Select `Facture avec détail`.
4. Create/preview, export, then print.

Expected:

1. All operations succeed exactly as in POS flow.
2. Dialog remains usable for operator workflow (no unexpected auto-close behavior specific to POS-only flow rules).

### E-06 - History summary invoice flow

Steps:

1. Repeat E-05 with `Facture sans détail`.

Expected:

1. End-to-end success for summary mode from History too.

---

## 5) Idempotency checks

### E-07 - Re-open same order should not create second invoice number

Steps:

1. Generate invoice for one order (record invoice number).
2. Re-open same order and attempt invoice generation again.

Expected:

1. Existing invoice is reused (`already_exists` behavior).
2. Invoice number stays identical.
3. No unexpected new sequence increment for same order.

---

## 6) Safeguard/error-path checks

### E-08 - Missing legal invoice fields (blocking)

Steps:

1. Attempt invoice generation/export/print with one or more mandatory legal fields intentionally missing.

Expected:

1. Operation is blocked.
2. Error is explicit and actionable (missing fields listed clearly).

### E-09 - Missing seller legal identity (blocking)

Steps:

1. In test environment, clear one seller legal identity field (for example SIRET) in settings.
2. Attempt invoice generation/export/print.

Expected:

1. Operation is blocked.
2. Error guides operator/admin to complete `Settings > Establishment` legal identity fields.

### E-10 - Recovery after correction

Steps:

1. Fix missing data from E-08 or E-09.
2. Retry invoice generation/export/print.

Expected:

1. Previously blocked flow now succeeds.
2. No residual false-positive compliance blocking.

---

## 7) Optional parity spot-checks

### E-11 - Preview/export/print legal parity

Steps:

1. For one detailed invoice and one summary invoice, compare:
   - browser preview,
   - exported content,
   - thermal print output class.

Expected:

1. Same legal information class exists across all three outputs.
2. No mandatory legal mention appears in only one output channel.

---

## 8) Final sign-off criteria

Sign-off is valid only if:

1. E-01 to E-07 pass,
2. E-08 and E-09 block as expected,
3. E-10 passes after correction,
4. no unresolved FAIL remains in evidence log.

Recommended sign-off statement:

`Invoice functional UAT passed for POS and History flows, including idempotency and legal safeguards, on <env> at <date>.`
