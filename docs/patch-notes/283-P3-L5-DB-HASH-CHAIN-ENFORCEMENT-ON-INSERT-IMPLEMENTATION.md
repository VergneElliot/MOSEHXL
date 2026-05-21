# 283 - P3-L5 (DB hash-chain enforcement on legal_journal INSERT) - Implementation

Date: 2026-05-21  
Related plan: `docs/patch-notes/282-P3-L5-DB-HASH-CHAIN-ENFORCEMENT-ON-INSERT-PLAN.md`

## What changed

### 1) Added DB-side legal journal INSERT integrity enforcement

Added migration:

- `MuseBar/backend/src/migrations/files/2026_05_21_18_45_00_enforce_legal_journal_hash_chain_on_insert.sql`

Key behavior:

1. Enables `pgcrypto` (`CREATE EXTENSION IF NOT EXISTS pgcrypto`).
2. Adds trigger function `enforce_legal_journal_insert_integrity()` that, per
   establishment chain:
   - reads prior row (`sequence_number`, `current_hash`),
   - computes expected next sequence number,
   - computes expected previous hash (`ZERO_HASH` for first row),
   - reconstructs signed payload
     (`sequence|type|order|amount|vat|payment|timestamp|register`),
   - recomputes expected SHA-256 hash,
   - raises exception if `sequence_number`, `previous_hash`, or `current_hash`
     does not match expected value.
3. Adds `BEFORE INSERT` trigger:
   - `trigger_enforce_legal_journal_insert_integrity`
   - on `legal_journal`.

### 2) Kept bootstrap schema aligned

Updated:

- `MuseBar/backend/src/models/legal-schema.sql`

Changes mirror migration logic:

1. `pgcrypto` extension declaration.
2. `enforce_legal_journal_insert_integrity()` function.
3. `trigger_enforce_legal_journal_insert_integrity` (`BEFORE INSERT`).

This keeps clean-bootstrap and migration-chain deployments behaviorally aligned.

### 3) Added migration regression test

Added:

- `MuseBar/backend/src/migrations/legalJournalHashChainEnforcement.migration.test.ts`

Asserts migration SQL includes:

1. `pgcrypto` enablement,
2. `BEFORE INSERT` trigger wiring,
3. sequence/previous/current hash validation clauses.

### 4) Updated compliance/audit docs

Updated:

- `docs/course/07-LEGAL-COMPLIANCE.md`
  - clarified that DB defenses now include insert-chain validation.
- `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md`
  - marked P3-L5 fixed in “already fixed” section.

## Verification

Executed:

1. `npx vitest run src/migrations/legalJournalHashChainEnforcement.migration.test.ts` -> pass
2. `npm run type-check` (backend) -> pass
3. `npx vitest run` (backend full suite) -> pass (`47/47`, `185/185`)
4. lint diagnostics on touched TypeScript files -> no issues

## Result

P3-L5 is closed:

- legal journal chain correctness is now enforced at PostgreSQL INSERT time,
  not only by application code.

