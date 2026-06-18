# 268 - P3-L2 (Closure bulletin + journal append fail-closed atomicity) - Plan

Date: 2026-05-20  
Source audit: `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md` (P3-L2)

## Why this patch exists

Manual closure endpoints currently create a `closure_bulletins` row first and then
attempt to append a `CLOSURE` entry to `legal_journal` via
`appendClosureJournalEntry(...)`. If the journal append fails, the helper catches
and logs the error but does not rethrow, so the route still returns `201`.

This leaves a legal inconsistency:

1. a closure bulletin exists (`closure_bulletins`),
2. no matching `CLOSURE` event is present in the immutable journal chain.

P3-L1 fixed this for the auto-closure scheduler path; P3-L2 now fixes the manual
closure routes (`/daily`, `/weekly`, `/monthly`, `/annual`, `/create`) so they
fail closed.

## Key schema/trigger constraint we must respect

`closure_bulletins` immutability trigger blocks updates/deletes only when
`OLD.is_closed = TRUE`. So if we insert a bulletin as `is_closed = FALSE`, we can:

1. delete it on journal append failure (compensating rollback),
2. set it to `is_closed = TRUE` only after journal append succeeds.

This gives transactional-like semantics without introducing privileged trigger
bypass operations in production paths.

## Scope

### In scope

1. Introduce an **open bulletin creation** path (`is_closed = false`, `closed_at = null`)
   used only by manual closure routes.
2. Make `appendClosureJournalEntry(...)` fail fast (no swallow) so route logic can
   handle rollback.
3. Add model/query helpers to:
   - mark an open bulletin closed,
   - delete an open bulletin.
4. Update all manual closure creation routes to:
   - create open bulletin,
   - append journal entry,
   - close bulletin on success,
   - delete open bulletin + return 500 on journal failure.
5. Add regression tests that prove fail-closed behavior.

### Out of scope

- Reworking closure generation into a single SQL transaction with one shared DB
  client across all calculation steps.
- Changing auto-closure scheduler behavior (already handled under P3-L1).
- Any changes to archive/export endpoints.

## Strategy

### Step 1 - Data-layer support for open/close/delete lifecycle

Update legal journal model/query layer:

1. Extend `JournalQueries.insertClosureBulletin(...)` with `isClosed` parameter
   (default `true`) so existing call sites remain unchanged.
2. Add `JournalQueries.closeOpenClosureBulletin(...)`:
   - `UPDATE closure_bulletins SET is_closed = true, closed_at = NOW()`
   - `WHERE id = $1 AND establishment_id = $2 AND is_closed = false`
   - return updated row.
3. Add `JournalQueries.deleteOpenClosureBulletin(...)`:
   - `DELETE ... WHERE id = $1 AND establishment_id = $2 AND is_closed = false`
   - returns affected-row boolean.
4. Expose wrappers through `ClosureOperations` and `LegalJournalModel`.

### Step 2 - Open-bulletin creation path for manual routes

Add explicit model helpers:

- `createDailyClosureOpen(...)`
- `createWeeklyClosureOpen(...)`
- `createMonthlyClosureOpen(...)`
- `createAnnualClosureOpen(...)`

These are identical to existing creation logic except they pass
`isClosed = false` when inserting the bulletin.

Manual routes switch to these methods. Existing non-manual paths continue using
the original methods and are untouched.

### Step 3 - Fail-closed route orchestration

Refactor `routes/legal/closure.ts`:

1. Remove swallow behavior from `appendClosureJournalEntry(...)`; let it throw.
2. Introduce helper flow used by all create endpoints:
   - create open bulletin
   - append journal entry
   - mark bulletin closed
3. On journal append error:
   - log error,
   - attempt `deleteOpenClosureBulletin(...)`,
   - throw `AppError('Failed to persist legal journal entry for closure', 500, ...)`.
4. If close step fails after append, throw `AppError` (surface issue; no silent
   success).

### Step 4 - Regression tests

Extend `legalArchiveClosure.permissions.test.ts`:

1. Existing success path: assert route uses open creation helper and then calls
   close helper after journal append.
2. New failure path:
   - open closure create succeeds,
   - `logClosure` fails,
   - response is 500,
   - `deleteOpenClosureBulletin` called with bulletin id + establishment id.

## Acceptance criteria

1. Manual closure endpoints never return `201` if legal journal append fails.
2. After journal append failure, no closed bulletin remains persisted for that attempt.
3. Successful manual closure creation returns a closed bulletin (`is_closed = true`)
   and includes a corresponding journal `CLOSURE` entry.
4. Existing route permissions and response contracts remain intact.
5. Tests lock this behavior and pass.

