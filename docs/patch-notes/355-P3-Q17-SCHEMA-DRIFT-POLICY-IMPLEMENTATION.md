# P3-Q17 Implementation - Schema Drift Policy + CI Enforcement

## Implemented

Closed audit item `P3-Q17` by defining canonical schema source and adding automated drift enforcement.

## Canonical policy

- **Canonical source:** `MuseBar/backend/src/migrations/files/*.sql`
- **Snapshot/reference files:**
  - `MuseBar/backend/src/models/legal-schema.sql`
  - `MuseBar/backend/src/models/multi-tenant-schema.sql`

Rule:
- Schema-changing migration updates must include snapshot reconciliation.
- Data-only/non-schema migrations may opt out with marker:
  - `-- SCHEMA_SNAPSHOT_NOT_REQUIRED`

## Code changes

### 1) Backend script

Added:
- `MuseBar/backend/scripts/check-legal-schema-drift.js`

Behavior:
- Computes changed files from git diff range (`GIT_BASE...GIT_HEAD` or fallback `HEAD~1...HEAD`)
- Detects changed migration SQL files
- Accepts only when:
  - snapshots changed, or
  - all changed migrations include exemption marker
- Fails CI with actionable error otherwise

### 2) Backend package script

Updated:
- `MuseBar/backend/package.json`

Added script:
- `check:schema-drift`

### 3) CI workflow integration

Updated:
- `.github/workflows/ci-cd.yml`

Backend test job now:
- checks out full git history (`fetch-depth: 0`)
- runs `npm run check:schema-drift` with event-based `GIT_BASE`/`GIT_HEAD`

### 4) Documentation

Updated:
- `docs/course/05-DATABASE.md`

Added explicit “schema source-of-truth policy” section with canonical source, snapshot files, CI behavior, and exemption marker.

### 5) Audit status

Updated:
- `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md`

Marked `P3-Q17` as **Fixed (2026-05-27)**.

## Verification

- Local drift-check script run: pass on current diff.
- Backend type-check: pass.

## Result

The repo now has a documented and enforced anti-drift policy: migrations are authoritative, snapshots are reconciled deliberately, and CI prevents silent divergence.
