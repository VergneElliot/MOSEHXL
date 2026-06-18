# 159 - P2-8 (Test Expansion Pass 14) - Implementation

Date: 2026-04-29  
Related plan: `docs/patch-notes/158-P2-8-TEST-EXPANSION-PASS-14-PLAN.md`

## What was implemented

Updated tests:

1. `MuseBar/backend/src/routes/legal/legalPermissionGates.test.ts`
2. `MuseBar/backend/src/routes/printing.routes.test.ts`

## 1) Compliance deny-path regression coverage

Extended `legalPermissionGates.test.ts` with:

- `GET /compliance/status` deny-path without `access_compliance`:
  - asserts `403`,
  - asserts `verifyJournalIntegrity` is not called.

- `GET /compliance/requirements` deny-path without `access_compliance`:
  - asserts `403`.

This complements existing allow-path tests and strengthens permission enforcement regression safety.

## 2) Printing printers failure contract coverage

Extended `printing.routes.test.ts` with:

- `GET /printing/printers` service-failure path:
  - forces manager/service acquisition error,
  - asserts `500 Failed to list printers`,
  - asserts error message propagation and logger invocation.

This locks the operational failure contract for a frequently used utility endpoint.

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/routes/printing.routes.test.ts src/routes/legal/legalArchiveClosure.permissions.test.ts src/routes/legal/legalPermissionGates.test.ts src/models/legalJournal/journalSigning.integrity.test.ts src/printing/printingConfigRepo.test.ts` ✅  
   - Result: 5 files passed, 54 tests passed.

2. `npm run type-check` ✅  
   - Result: TypeScript no-emit check passed.

3. Lint diagnostics on touched files ✅  
   - No linter errors.

## Outcome

P2-8 Pass 14 is complete:
- compliance status/requirements deny contracts are explicitly guarded,
- printing printers failure behavior is regression-tested,
- C5 route-level coverage gains more balance across both allow and deny/failure paths.
