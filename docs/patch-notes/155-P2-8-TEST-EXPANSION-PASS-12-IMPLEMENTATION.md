# 155 - P2-8 (Test Expansion Pass 12) - Implementation

Date: 2026-04-29  
Related plan: `docs/patch-notes/154-P2-8-TEST-EXPANSION-PASS-12-PLAN.md`

## What was implemented

Updated tests:

1. `MuseBar/backend/src/routes/legal/legalArchiveClosure.permissions.test.ts`
2. `MuseBar/backend/src/routes/printing.routes.test.ts`

## 1) Legal monthly-latest no-data contract coverage

Extended `legalArchiveClosure.permissions.test.ts` with:

- `GET /closure/monthly-latest` no-current-month case:
  - with `access_closure` permission,
  - mocked monthly bulletin from an older month,
  - asserts route returns `404` with:
    - `No monthly closure bulletin found for the current month.`
  - asserts scoped collaborator call:
    - `getClosureBulletins(EST, 'MONTHLY')`.

This protects expected no-data behavior for monthly closure UI/reporting path.

## 2) Epson poll route contract coverage

Extended `printing.routes.test.ts` with:

- `GET /printing/epson/poll` success path:
  - mocked handler returns `200 text/plain`,
  - asserts body contract and handler invocation.

- `GET /printing/epson/poll` failure path:
  - mocked handler throws,
  - asserts route returns `500` with `Internal error`,
  - asserts logger error path is exercised.

This adds explicit regression protection for the printer poll utility endpoint.

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/routes/printing.routes.test.ts src/routes/legal/legalArchiveClosure.permissions.test.ts src/routes/legal/legalPermissionGates.test.ts src/models/legalJournal/journalSigning.integrity.test.ts src/printing/printingConfigRepo.test.ts` ✅  
   - Result: 5 files passed, 48 tests passed.

2. `npm run type-check` ✅  
   - Result: TypeScript no-emit check passed.

3. Lint diagnostics on touched files ✅  
   - No linter errors.

## Outcome

P2-8 Pass 12 is complete:
- legal monthly-latest now has explicit not-found regression coverage,
- Epson poll route has both success and failure contract tests,
- C5 coverage expansion continues to reduce route-level behavior regressions.
