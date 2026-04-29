# 149 - P2-8 (Test Expansion Pass 9) - Implementation

Date: 2026-04-29  
Related plan: `docs/patch-notes/148-P2-8-TEST-EXPANSION-PASS-9-PLAN.md`

## What was implemented

Updated tests:

1. `MuseBar/backend/src/routes/legal/legalArchiveClosure.permissions.test.ts`
2. `MuseBar/backend/src/routes/printing.routes.test.ts`

## 1) Legal archive create-path regression coverage

Extended `legalArchiveClosure.permissions.test.ts` with:

- `POST /archive/create` validation failure when required fields are missing:
  - asserts `400` with expected message.

- `POST /archive/create` allow-path with `access_closure`:
  - asserts `201`,
  - asserts `ArchiveService.exportData` is called with establishment-scoped payload:
    - `establishment_id: EST`,
    - `created_by` from authenticated user id,
    - `export_type`, `format`, and date fields.
  - asserts response archive payload.

To support the allow-path assertion, archive service test mocks now expose/reset `exportData`.

## 2) Printing configuration validation coverage

Extended `printing.routes.test.ts` with:

- missing-provider path for `POST /printing/configuration`:
  - asserts `400 Provider is required`,
  - asserts `savePrintingConfiguration` is not called.

This locks an important defensive contract on a configuration endpoint.

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/routes/printing.routes.test.ts src/routes/legal/legalArchiveClosure.permissions.test.ts src/routes/legal/legalPermissionGates.test.ts src/models/legalJournal/journalSigning.integrity.test.ts src/printing/printingConfigRepo.test.ts` ✅  
   - Result: 5 files passed, 38 tests passed.

2. `npm run type-check` ✅  
   - Result: TypeScript no-emit check passed.

3. Lint diagnostics on touched files ✅  
   - No linter errors.

## Outcome

P2-8 Pass 9 is complete:
- legal archive create route now has validation + positive scoped regression coverage,
- printing configuration missing-provider contract is explicitly protected,
- C5 route-contract confidence continues to improve across compliance-critical surfaces.
