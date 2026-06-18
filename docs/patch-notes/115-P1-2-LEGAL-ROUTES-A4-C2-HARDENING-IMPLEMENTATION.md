# 115 - P1-2 (Legal Routes A4 + C2 Hardening) - Implementation

Date: 2026-04-29  
Related plan: `docs/patch-notes/114-P1-2-LEGAL-ROUTES-A4-C2-HARDENING-PLAN.md`

## What was implemented

## 1) Legal read surfaces now enforce explicit compliance permission

Updated:
- `MuseBar/backend/src/routes/legal/journal.ts`
- `MuseBar/backend/src/routes/legal/compliance.ts`
- `MuseBar/backend/src/routes/legal/stats.ts`

Permission hardening:
- Added `requirePermission(P.access_compliance)` on:
  - `GET /api/legal/journal/verify`
  - `GET /api/legal/journal/entries`
  - `GET /api/legal/compliance/status`
  - `GET /api/legal/compliance/report`
  - `GET /api/legal/compliance/requirements`
  - `GET /api/legal/stats/monthly-live`

Notes:
- `businessDayStats` route intentionally left unchanged (authenticated establishment users) per existing routing contract.
- `journal/stats` and `journal/reset` admin-only endpoints remain admin-gated.

## 2) C2 error-flow alignment on touched legal route files

Updated:
- `journal.ts`, `compliance.ts`, `stats.ts`

Changes:
- Converted handlers to `asyncHandler(...)`.
- Replaced local catch+response blocks with:
  - structured `logger.error(...)`
  - `throw new AppError(...)` with route-specific error codes.
- Removed direct `process.stderr` usage from touched compliance/stats handlers.

## 3) Regression tests added for new permission gates

Added:
- `MuseBar/backend/src/routes/legal/legalPermissionGates.test.ts`

Coverage:
1. `/journal/verify` denied without `access_compliance`.
2. `/journal/verify` allowed with `access_compliance`.
3. `/compliance/report` denied without `access_compliance`.
4. `/stats/monthly-live` denied without `access_compliance`.

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/routes/legal/legalPermissionGates.test.ts` ✅
   - Result: 1 file passed, 4 tests passed.

2. `npm run type-check` ✅
   - Result: TypeScript no-emit check passed.

3. Lints check (edited files) ✅
   - No linter errors on:
     - `journal.ts`
     - `compliance.ts`
     - `stats.ts`
     - `legalPermissionGates.test.ts`

## Outcome

P1-2 is complete:
- remaining legal read surfaces touched in this pass are no longer auth-only/admin-only by default and now enforce explicit compliance permission,
- touched legal route files are aligned with centralized C2 error handling patterns,
- regression tests guard the new permission gates.
