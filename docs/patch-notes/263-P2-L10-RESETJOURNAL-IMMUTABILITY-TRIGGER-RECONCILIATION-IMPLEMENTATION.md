# 263 - P2-L10 (resetJournal vs immutability trigger) - Implementation

Date: 2026-05-20  
Related plan: `docs/patch-notes/262-P2-L10-RESETJOURNAL-IMMUTABILITY-TRIGGER-RECONCILIATION-PLAN.md`

## What changed

Updated:
- `MuseBar/backend/src/models/legalJournal/journalQueries.ts`

`resetJournalDevOnly()` now uses:

1. `TRUNCATE TABLE legal_journal RESTART IDENTITY`

instead of:

1. `DELETE FROM legal_journal`
2. `ALTER SEQUENCE legal_journal_id_seq RESTART WITH 1`

## Why this reconciles L10

The legal immutability trigger blocks row-level `DELETE` on `legal_journal`.
Using `TRUNCATE ... RESTART IDENTITY` avoids this row-delete path while keeping
the route dev-only and destructive reset semantics intact.

## Regression coverage added

Added:
- `MuseBar/backend/src/models/legalJournal/journalQueries.resetJournalDevOnly.test.ts`

Covers:
1. production guard still blocks reset,
2. non-production reset executes the truncate statement.

## Verification

Executed:
1. `npm run type-check` -> pass
2. lint diagnostics on touched files -> no issues

Note:
- This backend currently has `"test": "echo \"Error: no test specified\" && exit 1"`
  in `package.json`, so targeted test execution via `npm run test -- ...` is not
  available in the current project state.

## Result

P2-L10 objective is satisfied: dev reset no longer conflicts with legal
immutability trigger behavior, while production remains protected.
