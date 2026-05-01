# 261 - P2-L9 (journal append serializable + retry) - Implementation

Date: 2026-05-01  
Related plan: `docs/patch-notes/260-P2-L9-JOURNAL-APPEND-SERIALIZABLE-RETRY-PLAN.md`

## What changed

## 1) Added transactional append primitive with serializable + retry

Updated:
- `MuseBar/backend/src/models/legalJournal/journalQueries.ts`

New behavior:
1. `appendEntryTransactional(...)` performs journal append inside one DB
   transaction.
2. Transaction explicitly sets isolation:
   - `SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`
3. Sequence/hash inputs are computed within that same transaction:
   - read last sequence for establishment
   - read previous hash for establishment
   - compute current hash
   - insert entry
4. Added bounded retry loop (`APPEND_MAX_RETRIES = 3`) for retryable database
   conflict codes:
   - `40001` (serialization failure)
   - `40P01` (deadlock detected)
5. Each failed attempt performs rollback and client release before retrying.

## 2) Wired public append operation to the new primitive

Updated:
- `MuseBar/backend/src/models/legalJournal/journalOperations.ts`

Change:
1. `JournalOperations.addEntry(...)` now delegates to
   `JournalQueries.appendEntryTransactional(...)`.
2. Existing public API and callers remain unchanged.

## 3) Added regression tests for retry behavior

Added:
- `MuseBar/backend/src/models/legalJournal/journalQueries.appendEntryTransactional.test.ts`

Coverage:
1. retries once on `40001` then succeeds.
2. fails after max retries when serialization conflict persists.

## Verification

Executed:
1. `npm run type-check` (backend) -> pass
2. `npm run test -- src/models/legalJournal/journalQueries.appendEntryTransactional.test.ts src/models/legalJournal/journalSigning.integrity.test.ts` -> pass (`2` files, `5` tests)
3. Lint diagnostics on touched files -> no issues

## Result

P2-L9 is now implemented: legal journal append is executed transactionally at
`SERIALIZABLE` isolation with retry-on-conflict behavior, reducing concurrency
risk for sequence/hash chain construction.
