# 263 - P2-L10 (resetJournal vs immutability trigger) - Implementation

Date: 2026-05-20  
Related plan: `docs/patch-notes/262-P2-L10-RESETJOURNAL-IMMUTABILITY-TRIGGER-RECONCILIATION-PLAN.md`

## What changed

Updated:

- `MuseBar/backend/src/models/legalJournal/journalQueries.ts`

`resetJournalDevOnly(establishmentId)` now performs the delete inside a
dedicated transaction that bypasses the legal immutability trigger via
`SET LOCAL session_replication_role = 'replica'`, while preserving the
per-tenant predicate. Effective sequence per call:

1. `BEGIN`
2. `SET LOCAL session_replication_role = 'replica'`
3. `DELETE FROM legal_journal WHERE establishment_id = $1`
4. `COMMIT`

On failure the transaction is rolled back and the client connection is
always released. The production guard (`NODE_ENV === 'production' → 403`)
fires before any client is acquired.

## Why this reconciles L10

The legal immutability trigger
(`trigger_prevent_legal_journal_modification`) blocks `DELETE` and `UPDATE`
on `legal_journal` per row. `SET LOCAL session_replication_role = 'replica'`
disables user triggers for the lifetime of the current transaction only,
which lets the dev reset path delete by tenant scope without removing or
weakening the trigger globally. A naive `TRUNCATE TABLE legal_journal
RESTART IDENTITY` would also bypass the trigger but would discard tenant
scoping, which is not acceptable on this branch (multi-establishment
journal).

## Regression coverage added

Added:

- `MuseBar/backend/src/models/legalJournal/journalQueries.resetJournalDevOnly.test.ts`

Covers:

1. Production guard still blocks reset (and no client is acquired).
2. Non-production reset issues `BEGIN`, `SET LOCAL session_replication_role
   = 'replica'`, the tenant-scoped `DELETE`, and `COMMIT` in that order.
3. On `DELETE` failure, the transaction is rolled back and the client is
   released.

## Verification

Executed:

1. `npm run type-check` -> pass
2. lint diagnostics on touched files -> no issues
3. `npm test -- journalQueries.resetJournalDevOnly` -> pass

## Result

P2-L10 objective is satisfied: dev reset no longer conflicts with legal
immutability trigger behavior, tenant scoping is preserved, and production
remains protected.
