# 333 — P3-Q9 migration checksum verify implementation

## What changed

### 1) Added checksum support to migration manager

Updated:

- `MuseBar/backend/src/migrations/migration-manager.ts`

Changes:

- Added `up_checksum` to migration metadata (computed as `SHA-256` of `-- UP` SQL content).
- Extended migrations table bootstrap to include `up_checksum` and ensured compatibility with existing DBs via:
  - `CREATE TABLE IF NOT EXISTS ... up_checksum VARCHAR(64)`
  - `ALTER TABLE migrations ADD COLUMN IF NOT EXISTS up_checksum VARCHAR(64)`
- Updated execution tracking insert to persist checksum:
  - `INSERT INTO migrations (id, name, up_checksum) ...`
- Added executed-migration checksum verification before applying pending migrations:
  - If DB checksum exists and differs from file checksum -> throw hard error and stop.
  - If DB checksum is missing (legacy row) -> baseline current checksum once via update.
- Updated status output to show checksum snippet and drift flag (`⚠️ DRIFT`) when detected.

### 2) Added focused tests for checksum behavior

Added:

- `MuseBar/backend/src/migrations/migration-manager.test.ts`

Coverage:

- Fails migrate on checksum mismatch for executed migrations.
- Baselines missing checksum for legacy executed rows.
- Persists checksum when applying a new pending migration.

### 3) Updated audit tracker

Updated:

- `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md`

Change:

- Marked `P3-Q9` as fixed with checksum storage + verification behavior.

## Verification

- `npm run type-check` ✅
- `npm run test -- src/migrations/migration-manager.test.ts` ✅
- `npm run test` ✅

## Notes

- Existing migrated databases without historical checksum metadata are baselined on first run after this change.
- From that baseline onward, edits to already-applied migration files are detected and block migration execution.
