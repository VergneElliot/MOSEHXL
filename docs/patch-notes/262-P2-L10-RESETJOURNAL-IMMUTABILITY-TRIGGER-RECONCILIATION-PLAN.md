# 262 - P2-L10 (resetJournal vs immutability trigger) - Plan

Date: 2026-05-20  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (L10)

## Why this patch exists

`JournalQueries.resetJournalDevOnly(establishmentId)` currently executes a
tenant-scoped `DELETE FROM legal_journal WHERE establishment_id = $1`. But
legal immutability is enforced by a row-level trigger
(`trigger_prevent_legal_journal_modification`) that blocks any `DELETE` on
`legal_journal`, so this dev reset path conflicts with the same legal
safeguards it must coexist with.

A naive switch to `TRUNCATE TABLE legal_journal RESTART IDENTITY` would
sidestep the trigger but loses the **per-tenant scope** that the development
branch enforces (multi-establishment journal). We need a fix that bypasses
the immutability trigger **only for this dev-only path** while preserving
the `WHERE establishment_id = $1` predicate.

## Scope

### In scope

1. Reconcile dev reset behavior with immutability trigger semantics.
2. Preserve tenant scoping (`WHERE establishment_id = $1`).
3. Keep production guard unchanged (`NODE_ENV === 'production'` blocks reset).
4. Add regression tests for dev/prod behavior and rollback safety.

### Out of scope

- Any production immutability relaxation.
- Changes to legal journal append logic (handled under L9).
- Cross-tenant or global truncation flows.

## Strategy

### Step 1 - Use trigger-bypass within a scoped transaction

Wrap the dev reset in a dedicated transaction that temporarily flips
`session_replication_role` to `'replica'` via `SET LOCAL`. With that role,
PostgreSQL skips user-defined triggers (including the immutability trigger)
for the lifetime of the transaction only, then auto-restores the default on
`COMMIT`/`ROLLBACK`.

Statements (in order, inside one client transaction):

1. `BEGIN`
2. `SET LOCAL session_replication_role = 'replica'`
3. `DELETE FROM legal_journal WHERE establishment_id = $1`
4. `COMMIT`

Why this approach:

1. Preserves tenant scoping (no global TRUNCATE).
2. Bypasses the immutability trigger only for the duration of the
   transaction — no schema mutation, no privileges leaked beyond the
   client session.
3. Production guard still applies before any DB work happens.
4. Failure path: explicit `ROLLBACK` so the dev DB is never left in a
   half-deleted state, and the client connection is always released.

### Step 2 - Add tests

Add dedicated tests to ensure:

1. Production mode rejects reset with 403-style error contract and never
   acquires a client.
2. Non-production mode executes the four statements above in order, with
   the tenant id bound to the `DELETE`.
3. If `DELETE` fails, the transaction is rolled back and the client is
   released.

### Step 3 - Verify

Run backend type-check + targeted legal journal tests + lints.

## Acceptance criteria

1. Dev reset no longer depends on forbidden `DELETE` row path being allowed
   by the immutability trigger.
2. Tenant scoping is preserved.
3. Production reset remains forbidden.
4. Test coverage locks this behavior, including rollback on failure.
