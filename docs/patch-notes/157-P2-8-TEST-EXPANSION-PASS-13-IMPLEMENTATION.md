# 157 - P2-8 (Test Expansion Pass 13) - Implementation

Date: 2026-04-29  
Related plan: `docs/patch-notes/156-P2-8-TEST-EXPANSION-PASS-13-PLAN.md`

## What was implemented

Updated tests:

1. `MuseBar/backend/src/routes/legal/legalPermissionGates.test.ts`
2. `MuseBar/backend/src/routes/printing.routes.test.ts`

## 1) Compliance report validation coverage

Extended `legalPermissionGates.test.ts` with two negative-path tests under `access_compliance`:

- `GET /compliance/report` without query dates:
  - asserts `400 Start date and end date are required`,
  - asserts report query collaborator is not called.

- `GET /compliance/report` with invalid date values:
  - asserts `400 Invalid date format`,
  - asserts report query collaborator is not called.

This locks route-level validation contracts beyond permission gating.

## 2) Printing history failure contract coverage

Extended `printing.routes.test.ts` with:

- `GET /printing/history` database failure path:
  - forces `pool.query` rejection,
  - asserts `500 Failed to get printing history`,
  - asserts error message propagation and logger path invocation.

This protects operational failure behavior for a core observability/history endpoint.

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/routes/printing.routes.test.ts src/routes/legal/legalArchiveClosure.permissions.test.ts src/routes/legal/legalPermissionGates.test.ts src/models/legalJournal/journalSigning.integrity.test.ts src/printing/printingConfigRepo.test.ts` ✅  
   - Result: 5 files passed, 51 tests passed.

2. `npm run type-check` ✅  
   - Result: TypeScript no-emit check passed.

3. Lint diagnostics on touched files ✅  
   - No linter errors.

## Outcome

P2-8 Pass 13 is complete:
- compliance report validation contracts are now explicitly regression-tested,
- printing history failure contract is now protected,
- C5 route-level coverage continues to mature across positive and negative behaviors.
