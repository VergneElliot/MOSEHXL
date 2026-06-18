# 88 - Code Hygiene C5 (Testing and CI Realism) - Plan

Date: 2026-04-23  
Phase: C5 from `docs/audits/2026-04-21-repo-audit-and-remediation-plan.part-3.md`

## Why this patch exists

C5 asks us to stop placeholder testing posture and enforce meaningful verification:

1. Ensure backend test command is real.
2. Make CI security gate fail on high-severity npm vulnerabilities.
3. Add a tenant-isolation test that proves `/api/orders` only returns caller-establishment data.

## Current state assessment

- Backend test command is already real (`vitest run`) in `MuseBar/backend/package.json` — no stub removal needed.
- CI currently runs:
  - `npm audit --audit-level=moderate` (frontend)
  - `npm audit --audit-level=moderate` (backend)
  This is stricter than C5 asks, but does not match the explicit C5 requirement wording.
- Existing backend tests do not yet include the requested multi-establishment `/api/orders` isolation scenario.

## Scope for this C5 pass

### In scope

1. Update CI workflow audit level to `high` for both frontend and backend audit jobs.
2. Add backend test covering:
   - 100 orders distributed across 3 establishments,
   - request to `GET /api/orders` with one establishment token,
   - assertion that all returned orders belong to that establishment and count matches.
3. Document result with verification evidence.

### Out of scope

- Full end-to-end integration with a live DB for this scenario (we keep test style consistent with current backend test suite using route-level mocks).

## Step-by-step plan

### Step 1 - CI security gate alignment
- Edit `.github/workflows/ci-cd.yml` to use `--audit-level=high` for npm audit steps.

### Step 2 - Tenant-isolation route test
- Add a focused route test under `backend/src/routes/orders/`:
  - build in-memory dataset (100 orders across 3 establishments),
  - mock order model methods used by `orderCRUD` route,
  - call `GET /api/orders` with JWT scoped to one establishment,
  - assert only matching-establishment orders are returned.

### Step 3 - Verification
- Run backend tests and typecheck.
- Confirm new test passes and CI workflow diff is correct.

### Step 4 - Documentation
- Add C5 implementation note with exact files changed and outcomes.

## Acceptance criteria

- CI uses `npm audit --audit-level=high`.
- `/api/orders` tenant-isolation test exists and passes.
- Backend typecheck/tests pass.
- C5 plan + implementation docs recorded and linked from audit.
