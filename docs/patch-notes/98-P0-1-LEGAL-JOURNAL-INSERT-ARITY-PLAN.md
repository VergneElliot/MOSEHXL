# 98 - P0-1 (Legal Journal INSERT Arity Fix) - Plan

Date: 2026-04-28  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

The latest full repo audit identified a critical blocker in the legal journal write path:

- `JournalQueries.insertEntry()` uses 13 columns and 13 bound values, but the SQL `VALUES` clause references placeholders `$1..$14`.

This mismatch can make legal journal writes fail at runtime while order creation can still return success in some flows, which is unacceptable for fiscal integrity.

## Scope

### In scope

1. Fix placeholder arity in `backend/src/models/legalJournal/journalQueries.ts`.
2. Add a focused backend regression test to prevent reintroducing placeholder/value count drift.
3. Run backend test + type-check verification.
4. Record implementation and verification in a dedicated implementation patch note.

### Out of scope

- Full transactional redesign of order + legal journal write coupling (tracked in subsequent P0 item).
- Wider legal journal refactors beyond this specific defect.

## Design choices

- **Smallest safe fix first**: remove the extra SQL placeholder only.
- **Regression guard**: assert both the SQL placeholder shape and values length from the insert path.
- **No behavior expansion**: keep method signatures and call sites unchanged.

## Step-by-step plan

### Step 1 - Fix query placeholder count
- In `JournalQueries.insertEntry`, change `VALUES ($1..$14)` to `VALUES ($1..$13)` to match the 13 insert columns and 13 values.

### Step 2 - Add regression test
- Add `journalQueries.insertEntry.test.ts` under legal journal model tests.
- Mock `pool.query` and assert:
  - insert SQL does not include `$14`,
  - bind array length is 13.

### Step 3 - Verify
- Run:
  - `npm run test -- src/models/legalJournal/journalQueries.insertEntry.test.ts`
  - `npm run type-check`

### Step 4 - Document
- Add implementation patch note with:
  - exact files changed,
  - what was fixed,
  - verification output summary.

## Acceptance criteria

- `insertEntry` SQL placeholder count matches bound values count.
- Regression test exists and passes.
- Backend type-check passes.
- Plan + implementation docs are committed for traceability.
