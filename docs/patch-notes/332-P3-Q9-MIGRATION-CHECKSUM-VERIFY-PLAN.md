# 332 — P3-Q9 migration checksum verify plan

## Objective

Implement checksum tracking for SQL migrations so already-applied migration edits are detected before new migrations are applied.

## Scope

### In scope

- Add `up_checksum` storage for executed migrations.
- Compute `SHA-256` checksum from each migration `-- UP` section.
- Verify checksums for already-executed migrations before applying pending migrations.
- Fail closed when checksum drift is detected.
- Add migration-manager unit tests for mismatch detection and checksum persistence.

### Out of scope

- Retroactive detection of edits that occurred before checksum tracking existed.
- Changes to migration SQL files themselves.

## Design decisions

1. Extend `migrations` table with nullable `up_checksum` (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).
2. Store checksum when marking migrations as executed.
3. During `migrate`, compare DB checksum vs current file checksum for each executed migration and throw on mismatch.
4. For legacy rows with null checksum, baseline once from current file checksum and persist.
5. Surface drift information in `status` output.

## Verification plan

- Backend type-check.
- Targeted unit tests for migration manager checksum behavior.
- Full backend test suite.
