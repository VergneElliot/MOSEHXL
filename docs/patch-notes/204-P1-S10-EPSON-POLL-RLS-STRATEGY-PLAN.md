# 204 - P1-S10 (Epson Poll RLS Strategy) - Plan

Date: 2026-04-30  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (P1-S10)

## Why this patch exists

`GET /api/printing/epson/poll` is intentionally unauthenticated and key-protected
for Epson TM-Intelligent polling, but it currently reads `printing_configurations`
with no per-request tenant context setup.

Under FORCE RLS this can fail closed unpredictably (or tempt unsafe bypass toggles).

## Scope

### In scope

1. Add strict establishment id validation on poll request.
2. Resolve `printing_configurations` under explicit per-request tenant DB context:
   - transaction,
   - `SET LOCAL app.establishment_id`.
3. Keep key validation behavior (header + temporary query fallback).
4. Add regression tests for tenant-context setup behavior.
5. Document implementation and verification.

### Out of scope

- Provisioning a dedicated Postgres role in runtime code.
- Replacing poll key scheme with a new signature protocol.

## Design choices

1. **Fail-closed tenant context**
   - No global bypass flag.
   - No reliance on ambient async request context for poll route.

2. **Transaction-scoped `SET LOCAL`**
   - keeps tenant scope narrowly bound to one poll DB read.

3. **Compatibility-preserving key flow**
   - keep header-first and query fallback until dedicated deprecation pass.

## Strategy

### Step 1 - Poll handler hardening

File:
- `MuseBar/backend/src/printing/epsonPollHandler.ts`

Plan:
- validate `establishment_id`/`eid` as UUID,
- read active printing config via dedicated client transaction:
  - `BEGIN`
  - `SELECT set_config('app.establishment_id', $1, true)`
  - tenant-scoped select
  - `COMMIT` / `ROLLBACK`.

### Step 2 - Regression tests

File:
- `MuseBar/backend/src/printing/epsonPollHandler.test.ts`

Plan:
- switch DB mock from bare `pool.query` to `pool.connect` client lifecycle,
- assert `BEGIN` + `set_config(...)` + `COMMIT`,
- keep existing key-validation behavior tests.

### Step 3 - Verify

Run:
- poll handler tests,
- printing route tests sanity,
- backend type-check + lint diagnostics.

## Acceptance criteria

1. Epson poll config lookup is tenant-scoped with explicit `SET LOCAL`.
2. Invalid establishment ids are rejected before DB query.
3. Tests prove transaction/context setup path.
