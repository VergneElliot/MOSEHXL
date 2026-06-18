# 205 - P1-S10 (Epson Poll RLS Strategy) - Implementation

Date: 2026-04-30  
Plan reference: `docs/patch-notes/204-P1-S10-EPSON-POLL-RLS-STRATEGY-PLAN.md`

## What was implemented

This patch hardens the unauthenticated Epson poll path so tenant data access is
explicitly scoped under RLS for each poll request.

## 1) Poll handler tenant-context hardening

Updated:
- `MuseBar/backend/src/printing/epsonPollHandler.ts`

Changes:
- Added strict UUID validation for `establishment_id`/`eid`.
  - invalid values now return `400` before DB calls.
- Added dedicated poll configuration loader with explicit DB context:
  - `BEGIN`
  - `SELECT set_config('app.establishment_id', $1, true)`
  - tenant-scoped config read from `printing_configurations`
  - `COMMIT`/`ROLLBACK`
  - `release()`

This removes reliance on ambient request context and avoids unsafe bypass behavior.

## 2) Regression tests updated

Updated:
- `MuseBar/backend/src/printing/epsonPollHandler.test.ts`

Changes:
- switched mocks to `pool.connect()` client lifecycle,
- added assertions for transaction + `set_config(...)` flow,
- kept key-validation behavior coverage,
- added invalid establishment-id format test (`400` and no DB connect).

## Verification

Executed:

1. `npm run test -- src/printing/epsonPollHandler.test.ts src/routes/printing.routes.test.ts`
   - Result: 2 files passed, 31 tests passed.

2. `npm run type-check`
   - Result: success.

3. Lint diagnostics on touched files
   - Result: no linter errors.

## Outcome

P1-S10 is completed for app-level hardening:
- Epson poll now resolves tenant context with explicit per-request `SET LOCAL` semantics,
- invalid establishment identifiers are rejected early,
- test coverage verifies transaction-context setup.
