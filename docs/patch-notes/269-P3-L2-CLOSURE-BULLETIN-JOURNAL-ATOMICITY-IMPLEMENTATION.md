# 269 - P3-L2 (Closure bulletin + journal append fail-closed atomicity) - Implementation

Date: 2026-05-20  
Related plan: `docs/patch-notes/268-P3-L2-CLOSURE-BULLETIN-JOURNAL-ATOMICITY-PLAN.md`

## What changed

### 1) Closure bulletin lifecycle now supports open -> journal -> close

Updated:

- `MuseBar/backend/src/models/legalJournal/journalQueries.ts`
- `MuseBar/backend/src/models/legalJournal/closureOperations.ts`
- `MuseBar/backend/src/models/legalJournal/index.ts`

Key additions:

1. `insertClosureBulletin(...)` now accepts an `isClosed` flag (default `true`)
   and sets `closed_at` accordingly (`NOW()` only when closed).
2. New query helpers:
   - `closeOpenClosureBulletin(closureBulletinId, establishmentId)`
   - `deleteOpenClosureBulletin(closureBulletinId, establishmentId)`
3. New model-level wrappers and open-create entry points:
   - `createDailyClosureOpen(...)`
   - `createWeeklyClosureOpen(...)`
   - `createMonthlyClosureOpen(...)`
   - `createAnnualClosureOpen(...)`
   - `closeOpenClosureBulletin(...)`
   - `deleteOpenClosureBulletin(...)`

Existing `create*Closure(...)` methods keep default behavior (`is_closed = true`)
for non-manual paths.

## 2) Manual closure routes now fail closed

Updated:

- `MuseBar/backend/src/routes/legal/closure.ts`

Refactor details:

1. `appendClosureJournalEntry(...)` no longer swallows journal failures; it
   now propagates errors.
2. Added `createClosureWithFailClosedJournal(...)` helper used by manual create
   endpoints (`/daily`, `/weekly`, `/monthly`, `/annual`, `/create`):
   - create open bulletin (`is_closed=false`)
   - append `CLOSURE` journal entry
   - mark bulletin closed
3. On journal append failure:
   - log via `LEGAL_JOURNAL` logger category
   - rollback by deleting the still-open bulletin
   - throw `AppError('Failed to persist legal journal entry for closure bulletin', ...)`
4. Route catch blocks now rethrow existing `AppError` instances (instead of
   always wrapping with generic create-failed messages), preserving fail-closed
   error contracts.

This removes the previous success-on-failure behavior where a closure bulletin
could be persisted even when legal journal append failed.

## 3) Regression tests extended

Updated:

- `MuseBar/backend/src/routes/legal/legalArchiveClosure.permissions.test.ts`

Changes:

1. Mocks updated for the new open/close/delete model methods.
2. Mounted `errorHandler` in the test app so thrown `AppError` payloads are
   asserted through the unified envelope.
3. Existing `/closure/create` success test now validates:
   - open creation helper called (`createDailyClosureOpen`)
   - journal append called
   - open bulletin finalized (`closeOpenClosureBulletin`)
   - no rollback deletion called
4. Added new fail-closed test:
   - journal append fails
   - route returns 500
   - `deleteOpenClosureBulletin` called with bulletin id + establishment
   - `closeOpenClosureBulletin` not called

## Verification

Executed:

1. `npm run type-check` (backend) -> pass
2. `npx vitest run src/routes/legal/legalArchiveClosure.permissions.test.ts` -> pass
3. `npx vitest run` (full backend suite) -> pass (`44/44`, `174/174`)
4. Lint diagnostics on touched files -> no issues

## Result

P3-L2 objective is satisfied for manual closure endpoints: closure creation is now
fail-closed with compensating rollback of open bulletins when legal journal
append fails, and successful paths only return closed bulletins after journal
append succeeds.

