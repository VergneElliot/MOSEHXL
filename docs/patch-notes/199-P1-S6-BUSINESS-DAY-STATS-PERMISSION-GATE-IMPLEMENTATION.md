# 199 - P1-S6 (Business-Day Stats Permission Gate) - Implementation

Date: 2026-04-30  
Plan reference: `docs/patch-notes/198-P1-S6-BUSINESS-DAY-STATS-PERMISSION-GATE-PLAN.md`

## What was implemented

This patch closes audit item P1-S6 by enforcing a granular permission gate on
the live business-day legal stats endpoint.

## 1) Route permission hardening

Updated:
- `MuseBar/backend/src/routes/legal/businessDayStats.ts`

Changes:
- imported `requirePermission` + `P`,
- added `requirePermission(P.access_compliance)` to:
  - `GET /api/legal/business-day-stats`.

Result:
- endpoint now follows the same legal-data permission model used elsewhere.

## 2) Route index comment correction

Updated:
- `MuseBar/backend/src/routes/legal/index.ts`

Change:
- replaced stale comment that said business-day stats are available to all authenticated users.
- comment now reflects that the route is permission-gated.

## 3) Regression tests added

New:
- `MuseBar/backend/src/routes/legal/businessDayStats.permissions.test.ts`

Coverage:
- deny-path without `access_compliance` (`403`),
- allow-path with `access_compliance` (`200`).

Also validated:
- `src/routes/legal/legalPermissionGates.test.ts` remains green.

## Verification

Executed:

1. `npm run test -- src/routes/legal/businessDayStats.permissions.test.ts src/routes/legal/legalPermissionGates.test.ts`
   - Result: 2 files passed, 19 tests passed.

2. `npm run type-check`
   - Result: success.

3. Lint diagnostics on touched files
   - Result: no linter errors.

## Outcome

P1-S6 is complete: `business-day-stats` now has the required granular permission
gate and no longer leaks legal-sensitive daily turnover details to all authenticated users.
