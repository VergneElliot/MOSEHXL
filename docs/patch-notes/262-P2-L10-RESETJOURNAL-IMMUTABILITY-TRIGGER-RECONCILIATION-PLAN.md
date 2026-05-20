# 262 - P2-L10 (resetJournal vs immutability trigger) - Plan

Date: 2026-05-20  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (L10)

## Why this patch exists

`JournalQueries.resetJournalDevOnly()` currently executes:

1. `DELETE FROM legal_journal`
2. `ALTER SEQUENCE legal_journal_id_seq RESTART WITH 1`

But legal immutability is enforced by a trigger on `legal_journal` that blocks
`DELETE`, so this dev reset path conflicts with the same legal safeguards it
coexists with.

## Scope

### In scope

1. Reconcile dev reset behavior with immutability trigger semantics.
2. Keep production guard unchanged (`NODE_ENV === 'production'` blocks reset).
3. Add regression tests for dev/prod behavior.

### Out of scope

- Any production immutability relaxation.
- Changes to legal journal append logic (handled under L9).

## Strategy

### Step 1 - Use trigger-compatible reset operation

Replace row-delete reset with:

- `TRUNCATE TABLE legal_journal RESTART IDENTITY`

Why:
1. avoids row-level `DELETE` path blocked by immutability trigger,
2. keeps reset behavior dev-only,
3. resets identity in one statement.

### Step 2 - Add tests

Add dedicated tests to ensure:
1. production mode rejects reset with 403-style error contract,
2. non-production mode executes truncate reset query.

### Step 3 - Verify

Run backend type-check + targeted legal journal tests + lints.

## Acceptance criteria

1. Dev reset no longer depends on forbidden `DELETE` operation.
2. Production reset remains forbidden.
3. Test coverage locks this behavior.
