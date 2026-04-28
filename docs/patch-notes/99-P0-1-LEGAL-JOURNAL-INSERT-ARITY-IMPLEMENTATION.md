# 99 - P0-1 (Legal Journal INSERT Arity Fix) - Implementation

Date: 2026-04-28  
Related plan: `docs/patch-notes/98-P0-1-LEGAL-JOURNAL-INSERT-ARITY-PLAN.md`

## What was implemented

## 1) Fixed legal journal INSERT placeholder mismatch

Updated:
- `MuseBar/backend/src/models/legalJournal/journalQueries.ts`

Change:
- In `JournalQueries.insertEntry()`, changed:
  - from `VALUES ($1, ..., $13, $14)`
  - to `VALUES ($1, ..., $13)`

Why:
- The query inserts 13 columns and binds 13 values.
- Keeping `$14` introduced SQL arity mismatch risk for fiscal journal writes.

## 2) Added regression test for placeholder/value alignment

Added:
- `MuseBar/backend/src/models/legalJournal/journalQueries.insertEntry.test.ts`

Coverage:
- Mocks `pool.query` from `app`.
- Calls `JournalQueries.insertEntry(...)`.
- Asserts:
  - SQL contains placeholders only up to `$13`,
  - SQL does not contain `$14`,
  - values array length is 13.

This guards against accidental reintroduction of placeholder/value drift in the legal journal write path.

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/models/legalJournal/journalQueries.insertEntry.test.ts` ✅
   - Result: 1 file passed, 1 test passed.

2. `npm run type-check` ✅
   - Result: TypeScript no-emit check passed.

3. Lints check (edited files) ✅
   - No linter errors reported on:
     - `journalQueries.ts`
     - `journalQueries.insertEntry.test.ts`

## Outcome

P0-1 is now closed:
- Legal journal insert placeholder arity is aligned with bound values.
- A targeted regression test is in place.
- Backend test/type-check verification passed.
