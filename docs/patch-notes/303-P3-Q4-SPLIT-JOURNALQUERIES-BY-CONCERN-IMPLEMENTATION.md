# 303 — P3-Q4 split `journalQueries.ts` by concern (implementation)

## What changed

### 1) Split legal journal query implementations into focused modules

Created:

- `MuseBar/backend/src/models/legalJournal/journalAppend.ts`
- `MuseBar/backend/src/models/legalJournal/journalRead.ts`
- `MuseBar/backend/src/models/legalJournal/journalStats.ts`
- `MuseBar/backend/src/models/legalJournal/journalDevReset.ts`

Concern ownership:

- `journalAppend.ts`: sequence/hash append path, direct insert, closure-bulletin write/update/delete helpers.
- `journalRead.ts`: entry retrieval, filtered/paginated reads, closure-bulletin reads, fond-de-caisse lookup.
- `journalStats.ts`: aggregate summaries (`sale` and journal stats).
- `journalDevReset.ts`: development-only journal reset with transaction-scoped trigger bypass.

### 2) Kept `JournalQueries` as stable facade

Replaced `MuseBar/backend/src/models/legalJournal/journalQueries.ts` with a thin compatibility class that delegates to the new modules.

This preserves all existing call-sites (`routes/legal/journal.ts`, `closureOperations.ts`, `journalOperations.ts`, tests) without changes to public method names or signatures.

### 3) Behavioral parity preserved on fiscal critical paths

No SQL semantics were changed. The append path still uses:

- SERIALIZABLE transaction + retry-on `40001`/`40P01`
- deterministic 4-decimal hash payload formatting
- hash chaining via previous/current hash computation

## Verification

- Backend type-check: `npm run type-check` ✅
- Journal query regressions:
  - `src/models/legalJournal/journalQueries.appendEntryTransactional.test.ts` ✅
  - `src/models/legalJournal/journalQueries.insertEntry.test.ts` ✅
  - `src/models/legalJournal/journalQueries.resetJournalDevOnly.test.ts` ✅
- Full backend suite: `npm test` (`51/51` files, `202/202` tests) ✅

## Notes

- This closes `P3-Q4` by removing the single-file query hotspot while preserving backwards compatibility and legal-path safety guarantees.
