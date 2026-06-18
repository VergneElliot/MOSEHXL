# 163 - P2-8 (Test Expansion Pass 16) - Implementation

Date: 2026-04-29  
Related plan: `docs/patch-notes/162-P2-8-TEST-EXPANSION-PASS-16-PLAN.md`

## What was implemented

Updated tests:

1. `MuseBar/backend/src/routes/legal/legalArchiveClosure.permissions.test.ts`
2. `MuseBar/backend/src/routes/printing.routes.test.ts`

## 1) Legal archive deny-path expansion

Extended `legalArchiveClosure.permissions.test.ts` with:

- `GET /archive/:id` deny-path without `access_closure`:
  - asserts `403`,
  - asserts archive lookup collaborator is not called.

- `POST /archive/create` deny-path without `access_closure`:
  - asserts `403`,
  - asserts archive export collaborator is not called.

This complements existing archive allow/validation tests with explicit permission-denial coverage on detail and create routes.

## 2) Printing receipt success-path coverage

Extended `printing.routes.test.ts` with:

- `POST /printing/receipt/:orderId` success path:
  - mocks receipt data and print service success,
  - asserts `200` response and receipt payload contract,
  - asserts printing history log invocation with expected metadata (`order_id`, `receipt_number`).

This closes a key command-route success-path gap in printing coverage.

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/routes/printing.routes.test.ts src/routes/legal/legalArchiveClosure.permissions.test.ts src/routes/legal/legalPermissionGates.test.ts src/models/legalJournal/journalSigning.integrity.test.ts src/printing/printingConfigRepo.test.ts` ✅  
   - Result: 5 files passed, 60 tests passed.

2. `npm run type-check` ✅  
   - Result: TypeScript no-emit check passed.

3. Lint diagnostics on touched files ✅  
   - No linter errors.

## Outcome

P2-8 Pass 16 is complete:
- legal archive routes now have stronger deny-path contract coverage,
- printing receipt command route now has explicit success-path + logging regression coverage,
- C5 route-level test posture is approaching diminishing-return territory for this scope.
