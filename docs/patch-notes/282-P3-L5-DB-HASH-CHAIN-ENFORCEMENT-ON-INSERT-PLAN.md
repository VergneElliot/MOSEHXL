# 282 - P3-L5 (DB hash-chain enforcement on legal_journal INSERT) - Plan

Date: 2026-05-21  
Source audit: `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md` (P3-L5)

## Why this patch exists

The application computes legal journal chain fields (`sequence_number`,
`previous_hash`, `current_hash`) before insert, but PostgreSQL itself did not
recompute/verify these values at write time.

That leaves a direct SQL insertion path where malformed chain data could be
written if app-level safeguards are bypassed.

## Scope

### In scope

1. Add DB trigger function to validate insert invariants on `legal_journal`.
2. Verify for each insert (within establishment chain):
   - expected next `sequence_number`,
   - expected `previous_hash`,
   - recomputed `current_hash` using SHA-256 payload convention.
3. Create migration-chain patch and keep bootstrap schema aligned.
4. Add migration regression test asserting required SQL guards exist.

### Out of scope

- Refactoring app hash-generation code.
- Switching hash algorithm or register-id strategy (covered by other items).

## Strategy

### Step 1 - DB enforcement function + trigger

In a new migration:

1. Ensure `pgcrypto` is available (`digest(..., 'sha256')`).
2. Create `enforce_legal_journal_insert_integrity()` trigger function.
3. In function:
   - load prior row for same establishment,
   - compute expected sequence and previous hash,
   - rebuild hash payload (`sequence|type|order|amount|vat|payment|timestamp|register`),
   - compute expected hash via SHA-256,
   - raise exception on any mismatch.
4. Add `BEFORE INSERT` trigger on `legal_journal`.

### Step 2 - Bootstrap schema parity

Mirror the same function + trigger in `models/legal-schema.sql` so non-migration
bootstrap environments inherit the exact same protection.

### Step 3 - Test + docs

1. Add migration test to assert SQL contains:
   - `pgcrypto` enablement,
   - `BEFORE INSERT` trigger,
   - sequence/previous/current hash validation logic.
2. Update compliance docs + audit tracker status.

### Step 4 - Verify

1. Run backend type-check.
2. Run full backend tests.
3. Ensure lints are clean for touched TypeScript files.

## Acceptance criteria

1. DB rejects legal journal inserts with broken sequence/hash continuity.
2. Migration-chain and bootstrap schema stay aligned.
3. Regression test locks in presence of DB-side integrity enforcement SQL.

