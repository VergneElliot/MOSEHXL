# P3-Q17 Plan - Schema Drift Policy (`legal-schema.sql` vs migrations)

## Context

Audit item `P3-Q17` flagged a governance gap: reference schema SQL files can drift from the migration chain unless there is one canonical source and an automated guard.

## Goal

Define and enforce a single source-of-truth policy for schema evolution:
- canonical: migration files
- snapshots: documentation/reference only, kept in sync intentionally

## Scope

- Document policy in database course docs.
- Add backend CI check that detects migration changes without matching snapshot reconciliation.
- Add an explicit exemption mechanism for data-only migrations.

## Strategy

1. Declare canonical source as `backend/src/migrations/files/*.sql`.
2. Treat `backend/src/models/legal-schema.sql` and `backend/src/models/multi-tenant-schema.sql` as snapshots.
3. Add script (`check:schema-drift`) that:
   - inspects changed files in git range
   - identifies changed migration files
   - passes when snapshots changed or migration has explicit exemption marker
   - fails otherwise
4. Wire check into backend CI workflow.

## Verification Plan

- Run script locally for current diff.
- Ensure backend CI workflow includes the check step.
- Run backend type-check to ensure no regressions from script/workflow additions.
