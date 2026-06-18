# 305 — P3-Q5 finish `db/pool.ts` decoupling (implementation)

## What changed

### 1) `db/pool.ts` is now the canonical pool owner

Updated:

- `MuseBar/backend/src/db/pool.ts`

This module now:

- loads environment config
- creates the shared `pg.Pool` instance
- applies tenant-context query wrapping (`set_config('app.establishment_id', ...)`)
- exports the ready-to-use `pool`

### 2) Removed pool ownership from `app.ts`

Updated:

- `MuseBar/backend/src/app.ts`

Changes:

- removed inline pool creation/wrapping logic
- imported `pool` from `./db/pool`
- kept middleware wiring unchanged (`createSecurityMiddleware(..., { pool })`)

### 3) Migrated pool imports across backend modules/services

Updated all remaining pool consumers to import from `db/pool` instead of `app` (models, legal journal modules, setup/establishment/user-invitation services, shared query utilities, scheduler, etc.).

### 4) Updated test mocks to match new import surface

Repointed test `vi.mock(...app...)` pool mocks to `vi.mock(...db/pool...)` where required, so tests continue intercepting DB access after decoupling.

## Verification

- Backend type-check: `npm run type-check` ✅
- Targeted regressions:
  - `src/models/legalJournal/journalQueries.appendEntryTransactional.test.ts` ✅
  - `src/services/legal/softwareEventJournal.runtime.test.ts` ✅
  - `src/utils/closureScheduler.test.ts` ✅
- Full backend suite: `npm test` (`51/51` files, `202/202` tests) ✅

## Notes

- This closes `P3-Q5`: `db/pool.ts` is now the true pool owner, and application/domain modules no longer depend on `app.ts` for DB access.
