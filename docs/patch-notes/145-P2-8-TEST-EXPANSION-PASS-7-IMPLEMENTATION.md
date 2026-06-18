# 145 - P2-8 (Test Expansion Pass 7) - Implementation

Date: 2026-04-29  
Related plan: `docs/patch-notes/144-P2-8-TEST-EXPANSION-PASS-7-PLAN.md`

## What was implemented

Updated tests:

1. `MuseBar/backend/src/routes/legal/legalArchiveClosure.permissions.test.ts`
2. `MuseBar/backend/src/routes/printing.routes.test.ts`

## 1) Legal archive detail route coverage

Extended `legalArchiveClosure.permissions.test.ts` with:

- allow-path for `GET /archive/:id` when `access_closure` is present:
  - asserts `ArchiveService.getArchiveExportById(archiveId, establishmentId)` scoping,
  - validates `200` response with archive payload.

- not-found contract for `GET /archive/:id` with permission:
  - mocks missing archive (`null`),
  - validates `404` response (`Archive not found`),
  - keeps scoped collaborator assertion.

To support these assertions, the test mock map now includes a hoisted `getArchiveExportById` spy.

## 2) Printing preview input-validation contract

Extended `printing.routes.test.ts` with:

- invalid input path for `GET /printing/receipt/:orderId/preview`:
  - verifies non-numeric order id returns `400` with `Invalid order id`.

Additionally, test isolation was hardened by resetting print-data collaborator mocks in `beforeEach`:
- `buildTestReceiptData`
- `buildReceiptDataForOrder`
- `buildClosureBulletinData`
- `logPrintingHistory`

This prevents cross-test call leakage and makes negative-path assertions deterministic.

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/routes/printing.routes.test.ts src/routes/legal/legalArchiveClosure.permissions.test.ts src/routes/legal/legalPermissionGates.test.ts src/models/legalJournal/journalSigning.integrity.test.ts src/printing/printingConfigRepo.test.ts` ✅  
   - Result: 5 files passed, 32 tests passed.

2. `npm run type-check` ✅  
   - Result: TypeScript no-emit check passed.

3. Lint diagnostics on touched files ✅  
   - No linter errors.

## Outcome

P2-8 Pass 7 is complete:
- legal archive detail contracts (allow and not-found) are now regression-tested with tenant scoping assertions,
- printing preview input validation contract is covered,
- route-test isolation improved for ongoing C5 expansion work.
