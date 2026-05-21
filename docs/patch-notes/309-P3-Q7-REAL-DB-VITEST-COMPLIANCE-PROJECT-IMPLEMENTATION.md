# 309 — P3-Q7 real-DB Vitest compliance project (implementation)

## What changed

### 1) Added a dedicated real-DB Vitest project

Updated:

- `MuseBar/backend/vitest.config.ts`

Changes:

- Default unit project now excludes `src/integration/real-db/**/*.test.ts`.
- Added conditional `real-db` project activated by `RUN_REAL_DB_TESTS=true`.
- Real-DB project uses node environment and a higher timeout for live DB operations.

### 2) Added real-DB compliance assertion tests

Created:

- `MuseBar/backend/src/integration/real-db/compliance.real-db.test.ts`

Coverage:

- Asserts live DB trigger blocks `UPDATE` and `DELETE` operations on `legal_journal` rows.
- Asserts tenant isolation visibility across establishments for `orders` queries when role supports meaningful RLS checks.
- Includes safe setup/cleanup helpers with temporary bypass mode for fixture management.

### 3) Added explicit runner script

Updated:

- `MuseBar/backend/package.json`

Added:

- `test:real-db` → `RUN_REAL_DB_TESTS=true vitest run --project real-db`

## Verification

- Backend type-check: `npm run type-check` ✅
- Default suite: `npm test` (`51/51` files, `202/202` tests) ✅
- Real-DB suite: `npm run test:real-db` (`1/1` file, `2/2` tests) ✅

## Notes

- Real-DB tests are opt-in and do not alter default unit/integration feedback loops.
- This closes `P3-Q7` by converting prior SQL-string-only confidence into runtime DB assertions.
