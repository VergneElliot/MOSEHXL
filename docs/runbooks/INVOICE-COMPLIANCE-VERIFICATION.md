# Invoice Compliance Verification Runbook

Date: 2026-05-28  
Scope: Step 4 / Phase D invoice verification

---

## 1) What this runbook does

This runbook helps you verify invoice compliance quickly using SQL checks.

It checks:

1. numbering uniqueness and sequence continuity,
2. mandatory legal fields presence,
3. seller identity presence in invoice snapshot,
4. hash-chain consistency,
5. immutability trigger presence.

The SQL file is:

- `docs/runbooks/INVOICE-COMPLIANCE-VERIFICATION.sql`

---

## 2) Prerequisites

1. Local database is running.
2. Migrations are up to date.
3. `psql` is installed.

Recommended before running:

```bash
npm run migration:status --workspace MuseBar/backend
```

---

## 3) How to run

From repository root, pick one of the two options.

### Option A - If you use `DATABASE_URL`

```bash
psql "$DATABASE_URL" -f "docs/runbooks/INVOICE-COMPLIANCE-VERIFICATION.sql"
```

### Option B - If you use PG* env vars

```bash
psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -f "docs/runbooks/INVOICE-COMPLIANCE-VERIFICATION.sql"
```

---

## 4) How to read results (very important)

Each section returns only anomalies.

1. **No rows returned** in a section = PASS for that rule.
2. **Rows returned** = FAIL for that rule, fix data or logic then rerun.

Key sections:

1. Duplicate numbers/sequence -> must be empty.
2. Missing legal fields -> must be empty.
3. Missing seller identity -> must be empty.
4. Hash-chain mismatch -> must be empty.
5. Trigger presence -> should list immutability trigger row(s).

---

## 5) Optional immutability smoke test

Run only in a safe non-production environment.

```sql
BEGIN;
UPDATE legal_invoices
SET payment_terms = payment_terms
WHERE id = (SELECT id FROM legal_invoices ORDER BY id DESC LIMIT 1);
ROLLBACK;
```

Expected behavior:

1. update fails with immutability error,
2. transaction is rolled back.

---

## 6) Typical remediation guidance

1. Missing seller identity fields:
   - update establishment/business settings (name, address, SIRET, VAT id).
2. Missing legal fields:
   - regenerate/fix invoice legal metadata path.
3. Sequence/hash anomalies:
   - investigate invoice creation flow and DB constraints before issuing new invoices.

---

## 7) Operator checklist (quick)

1. Run SQL script.
2. Ensure all anomaly sections are empty.
3. Confirm trigger section shows legal invoice immutability trigger.
4. Archive output with release notes when preparing validation evidence.
