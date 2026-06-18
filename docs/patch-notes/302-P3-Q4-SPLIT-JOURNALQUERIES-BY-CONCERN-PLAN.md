# 302 — P3-Q4 split `journalQueries.ts` by concern (plan)

## Objective

Break up the legal-journal query god module into smaller concern-focused files while keeping all existing call-sites stable.

## Scope

### In scope

- Split implementations from `journalQueries.ts` into:
  - `journalAppend.ts`
  - `journalRead.ts`
  - `journalStats.ts`
  - `journalDevReset.ts`
- Keep `JournalQueries` class API unchanged as a compatibility facade.
- Preserve legal/fiscal behavior (hash-chain append, closure bulletin persistence, dev reset safeguards).

### Out of scope

- SQL behavior changes.
- Route/service-level functional refactors.
- Schema or migration updates.

## Design decisions

1. Maintain `JournalQueries` as a thin wrapper so existing imports/tests remain intact.
2. Move hash/append transaction internals into `journalAppend.ts` to isolate critical write-path logic.
3. Keep read/filter/pagination code in `journalRead.ts`, and summary aggregates in `journalStats.ts`.
4. Keep destructive dev-only reset isolated in `journalDevReset.ts` for clearer operational boundaries.

## Verification plan

- Backend type-check.
- Journal query regression tests (`appendEntryTransactional`, `insertEntry`, `resetJournalDevOnly`).
- Full backend test suite.
