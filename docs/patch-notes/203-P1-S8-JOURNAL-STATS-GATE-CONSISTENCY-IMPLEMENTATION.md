# 203 - P1-S8 (Journal Stats Gate Consistency) - Implementation

Date: 2026-04-30  
Plan reference: `docs/patch-notes/202-P1-S8-JOURNAL-STATS-GATE-CONSISTENCY-PLAN.md`

## What was implemented

This patch resolves the `journal/stats` role/scope mismatch identified in P1-S8.

## 1) `/journal/stats` permission model aligned

Updated:
- `MuseBar/backend/src/routes/legal/journal.ts`

Change:
- Replaced:
  - `requireAdmin`
- With:
  - `requirePermission(P.access_compliance)`

Behavior now aligns with other legal read routes:
- `/journal/verify`
- `/journal/entries`
- `/compliance/*`
- `/stats/monthly-live`

Tenant scoping remains unchanged through `getEstablishmentId(...)`.

## 2) Regression tests updated

Updated:
- `MuseBar/backend/src/routes/legal/legalPermissionGates.test.ts`

Changes:
- Replaced obsolete admin-only expectation for `/journal/stats`.
- Added explicit gate checks:
  - deny-path without `access_compliance`,
  - allow-path with `access_compliance`.

## Verification

Executed:

1. `npm run test -- src/routes/legal/legalPermissionGates.test.ts`
   - Result: 1 file passed, 18 tests passed.

2. `npm run type-check`
   - Result: success.

3. Lint diagnostics on touched files
   - Result: no linter errors.

## Outcome

P1-S8 is complete:
- the broken `requireAdmin` + `getEstablishmentId` combo on `/journal/stats` is removed,
- legal permissions are consistent across the journal/compliance/stats read surfaces.
