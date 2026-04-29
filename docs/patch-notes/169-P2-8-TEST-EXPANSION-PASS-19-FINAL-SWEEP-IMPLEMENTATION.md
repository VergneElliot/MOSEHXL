# 169 - P2-8 (Test Expansion Pass 19 - Final Sweep) - Implementation

Date: 2026-04-29  
Related plan: `docs/patch-notes/168-P2-8-TEST-EXPANSION-PASS-19-FINAL-SWEEP-PLAN.md`

## What was implemented

Updated tests:

1. `MuseBar/backend/src/routes/legal/legalPermissionGates.test.ts`
2. `MuseBar/backend/src/routes/printing.routes.test.ts`

## 1) Journal entries default-pagination contract

Extended `legalPermissionGates.test.ts` with:

- `GET /journal/entries` with omitted pagination params:
  - asserts scoped query call uses defaults:
    - `limit: 100`,
    - `offset: 0`,
    - `start_date/end_date: undefined`,
    - `establishment_id: EST`.
  - asserts response pagination contract (`limit`, `offset`).

This protects route behavior for default query handling on a compliance-sensitive endpoint.

## 2) Printing configuration establishment-guard contract

Extended `printing.routes.test.ts` with:

- `GET /printing/configuration` with missing establishment context:
  - asserts `400 Establishment context required`,
  - asserts configuration repository is not called.

This ensures middleware-level tenant guard behavior is explicitly regression-tested on configuration read path.

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/routes/printing.routes.test.ts src/routes/legal/legalArchiveClosure.permissions.test.ts src/routes/legal/legalPermissionGates.test.ts src/models/legalJournal/journalSigning.integrity.test.ts src/printing/printingConfigRepo.test.ts` ✅  
   - Result: 5 files passed, 67 tests passed.

2. `npm run type-check` ✅  
   - Result: TypeScript no-emit check passed.

3. Lint diagnostics on touched files ✅  
   - No linter errors.

## Outcome

P2-8 final sweep pass is complete:
- last targeted route-contract gaps identified in this lane are now covered,
- test suite for this audit-driven slice is substantially strengthened,
- this closes the incremental route-level C5 expansion track before shifting to next priority areas.
