# 161 - P2-8 (Test Expansion Pass 15) - Implementation

Date: 2026-04-29  
Related plan: `docs/patch-notes/160-P2-8-TEST-EXPANSION-PASS-15-PLAN.md`

## What was implemented

Updated tests:

1. `MuseBar/backend/src/routes/legal/legalArchiveClosure.permissions.test.ts`
2. `MuseBar/backend/src/routes/printing.routes.test.ts`

## 1) Legal archive export deny-path coverage

Extended `legalArchiveClosure.permissions.test.ts` with:

- `POST /archive/:id/export` deny-path without `access_closure`:
  - asserts `403`.

This complements existing export validation/success tests with explicit permission-deny protection.

## 2) Printing status/configuration failure contracts

Extended `printing.routes.test.ts` with:

- `GET /printing/status` failure path:
  - forces service acquisition failure,
  - asserts `500 Failed to check printer status`,
  - asserts error message propagation and logger invocation.

- `GET /printing/configuration` failure path:
  - forces configuration repository failure,
  - asserts `500 Failed to get printing configuration`,
  - asserts error message propagation and logger invocation.

This increases operational-contract coverage for two key read endpoints.

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/routes/printing.routes.test.ts src/routes/legal/legalArchiveClosure.permissions.test.ts src/routes/legal/legalPermissionGates.test.ts src/models/legalJournal/journalSigning.integrity.test.ts src/printing/printingConfigRepo.test.ts` ✅  
   - Result: 5 files passed, 57 tests passed.

2. `npm run type-check` ✅  
   - Result: TypeScript no-emit check passed.

3. Lint diagnostics on touched files ✅  
   - No linter errors.

## Outcome

P2-8 Pass 15 is complete:
- legal archive export permission-deny behavior is now explicitly guarded,
- printing status/configuration failure contracts are regression-tested,
- route-level C5 coverage remains consistent and increasingly comprehensive.
