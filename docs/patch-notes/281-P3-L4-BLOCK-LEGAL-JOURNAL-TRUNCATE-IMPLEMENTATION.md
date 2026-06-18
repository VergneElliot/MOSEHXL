# 281 - P3-L4 (Block TRUNCATE on legal_journal) - Implementation

Date: 2026-05-21  
Related plan: `docs/patch-notes/280-P3-L4-BLOCK-LEGAL-JOURNAL-TRUNCATE-PLAN.md`

## What changed

### 1) Added DB-level TRUNCATE denial in migration chain

Added migration:

- `MuseBar/backend/src/migrations/files/2026_05_21_18_30_00_block_legal_journal_truncate.sql`

UP changes:

1. Creates trigger function `prevent_legal_journal_truncate()`.
2. Creates statement-level trigger:
   - `trigger_prevent_legal_journal_truncate`
   - `BEFORE TRUNCATE ON legal_journal`
3. Raises compliance exception on attempted truncate.

DOWN changes:

1. Drops the TRUNCATE trigger.
2. Drops `prevent_legal_journal_truncate()` function.

### 2) Kept bootstrap schema aligned with migration behavior

Updated:

- `MuseBar/backend/src/models/legal-schema.sql`

Added the same function + `BEFORE TRUNCATE` trigger so clean bootstrap installs
have identical immutability behavior to migration-chain installs.

### 3) Documented immutable-journal operation policy

Updated:

- `docs/course/07-LEGAL-COMPLIANCE.md`

Changes:

1. Clarified immutability now covers `UPDATE/DELETE/TRUNCATE`.
2. Added explicit backup/restore policy note:
   - use read-only `pg_dump`,
   - restore in controlled target environments,
   - do not routinely disable immutability triggers in production.

### 4) Audit tracker status updated

Updated:

- `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md`

Added fixed-state line for `legal_journal` TRUNCATE protection (P3-L4).

## Verification

Executed:

1. `npm run type-check` (backend) -> pass
2. `npx vitest run` (backend full suite) -> pass (`46/46`, `183/183`)

## Result

P3-L4 is closed:

- legal journal immutability now blocks row modification and table purge paths
  (`UPDATE`, `DELETE`, `TRUNCATE`) at PostgreSQL level.

