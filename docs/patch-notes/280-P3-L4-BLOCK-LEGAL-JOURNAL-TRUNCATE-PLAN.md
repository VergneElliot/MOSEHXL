# 280 - P3-L4 (Block TRUNCATE on legal_journal) - Plan

Date: 2026-05-21  
Source audit: `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md` (P3-L4)

## Why this patch exists

`legal_journal` immutability currently blocks row-level `UPDATE/DELETE`, but not
table-level `TRUNCATE`. That leaves a high-impact purge path that bypasses the
existing row trigger and undermines inalterability guarantees.

P3-L4 requires complete DB-side blocking for:

- `UPDATE`
- `DELETE`
- `TRUNCATE`

## Scope

### In scope

1. Add DB function + trigger to deny `TRUNCATE` on `legal_journal`.
2. Keep row-level immutability trigger as-is.
3. Update bootstrap SQL reference (`legal-schema.sql`) so fresh installs and
   migration-chain installs converge.
4. Document operational backup/restore policy (`pg_dump`/restore) for this rule.

### Out of scope

- New archive format or retention strategy changes.
- Emergency break-glass tooling for trigger bypass.

## Strategy

### Step 1 - Migration chain hardening

Add a migration file that:

1. creates `prevent_legal_journal_truncate()` trigger function,
2. creates `BEFORE TRUNCATE` statement trigger on `legal_journal`,
3. includes rollback (`DROP TRIGGER`, `DROP FUNCTION`) in DOWN.

### Step 2 - Keep bootstrap schema aligned

Update `models/legal-schema.sql` with the same function + trigger so a direct
bootstrap environment has identical immutability behavior.

### Step 3 - Documentation

Update compliance course doc to state:

1. immutability covers `UPDATE/DELETE/TRUNCATE`,
2. backup/restore policy uses read-only dump (`pg_dump`) and controlled restore,
   without routine trigger disabling in production.

### Step 4 - Verify

1. Run backend type-check and full backend tests for regression safety.
2. Confirm no lints from touched TypeScript files (none expected from SQL/docs).

## Acceptance criteria

1. `TRUNCATE legal_journal` is blocked at DB level.
2. Bootstrap SQL and migration chain remain consistent.
3. Compliance docs explicitly mention the TRUNCATE block and restore policy.

