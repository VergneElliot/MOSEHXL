# 361 - P3-L2 (auto-closure journal atomicity follow-up) - Implementation

Plan reference: `docs/patch-notes/360-P3-L2-AUTO-CLOSURE-JOURNAL-ATOMICITY-FOLLOWUP-PLAN.md`

## What changed

### 1) Scheduler now uses open -> append -> finalize flow

Updated `MuseBar/backend/src/utils/closureScheduler.ts`:

- Replaced `createDailyClosure(...)` with `createDailyClosureOpen(...)`.
- Added strict bulletin id validation.
- After successful `logClosure(...)`, scheduler now finalizes with `closeOpenClosureBulletin(...)`.
- On journal append failure:
  - emits `AUTO_CLOSURE_JOURNAL_APPEND_FAILED`,
  - rolls back via `deleteOpenClosureBulletin(...)`,
  - throws `AUTO_CLOSURE_JOURNAL_APPEND_FAILED` to fail closed.

This aligns scheduler semantics with the fail-closed legal invariant already used by manual closure routes.

### 2) Regression tests updated to enforce fail-closed behavior

Updated `MuseBar/backend/src/utils/closureScheduler.test.ts`:

- Added mocks for `createDailyClosureOpen`, `closeOpenClosureBulletin`, and `deleteOpenClosureBulletin`.
- Success case now asserts finalize call and no rollback.
- Journal append failure case now asserts:
  - method rejects (no silent success),
  - rollback is executed,
  - no `AUTO_CLOSURE_EXECUTED` event is recorded,
  - outer `AUTO_CLOSURE_FAILED` path is triggered.

## Verification run

- `npm test -- src/utils/closureScheduler.test.ts` -> pass (4/4)
- `npm run type-check` -> pass

## Outcome

Auto-closure no longer leaves legally finalized closure bulletins without matching `CLOSURE` entries when journal append fails. The scheduler path is now fail-closed and auditable end-to-end.
