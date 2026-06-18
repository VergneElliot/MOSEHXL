# 151 - P2-8 (Test Expansion Pass 10) - Implementation

Date: 2026-04-29  
Related plan: `docs/patch-notes/150-P2-8-TEST-EXPANSION-PASS-10-PLAN.md`

## What was implemented

Updated tests:

1. `MuseBar/backend/src/routes/legal/legalArchiveClosure.permissions.test.ts`
2. `MuseBar/backend/src/routes/printing.routes.test.ts`

## 1) Legal archive export route coverage

Extended `legalArchiveClosure.permissions.test.ts` with:

- `POST /archive/:id/export` invalid-id path:
  - `archiveId` non-numeric returns `400 Invalid archive ID`.

- `POST /archive/:id/export` allow-path with `access_closure`:
  - returns `200`,
  - asserts response contract fields:
    - `message: Archive exported successfully`,
    - default `format: json`,
    - `export_data.archiveId` and `export_data.format`.

This adds explicit contract protection for the archive export route until deeper export implementation is introduced.

## 2) Printing utility route coverage

Extended `printing.routes.test.ts` with:

- `GET /printing/printers` success path:
  - asserts establishment id in response,
  - asserts printers payload,
  - asserts manager is resolved for caller establishment.

- `POST /printing/test` success path:
  - mocks `buildTestReceiptData` and `printReceipt`,
  - asserts route returns `Test print queued successfully`,
  - asserts test receipt build and print invocation contract.

This closes two remaining route-level utility-path gaps in printing coverage.

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/routes/printing.routes.test.ts src/routes/legal/legalArchiveClosure.permissions.test.ts src/routes/legal/legalPermissionGates.test.ts src/models/legalJournal/journalSigning.integrity.test.ts src/printing/printingConfigRepo.test.ts` ✅  
   - Result: 5 files passed, 42 tests passed.

2. `npm run type-check` ✅  
   - Result: TypeScript no-emit check passed.

3. Lint diagnostics on touched files ✅  
   - No linter errors.

## Outcome

P2-8 Pass 10 is complete:
- legal archive export route has explicit validation/success contract tests,
- printing route coverage now includes printers listing and test-print command path,
- C5 route-level coverage has been materially expanded across legal and printing surfaces.
