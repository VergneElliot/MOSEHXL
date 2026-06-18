# 139 - P2-8 (Test Expansion Pass 4) - Implementation

Date: 2026-04-29  
Related plan: `docs/patch-notes/138-P2-8-TEST-EXPANSION-PASS-4-PLAN.md`

## What was implemented

Updated tests:

1. `MuseBar/backend/src/routes/printing.routes.test.ts`
2. `MuseBar/backend/src/routes/legal/legalArchiveClosure.permissions.test.ts`

## 1) Printing preview route coverage

Extended `printing.routes.test.ts` with two route-level regressions for:

- `GET /printing/receipt/:orderId/preview` success path:
  - validates response shape includes `receipt_data`,
  - asserts `buildReceiptDataForOrder` is called with caller establishment context (`est-1`) and requested preview `type`.

- `GET /printing/receipt/:orderId/preview` not-found contract:
  - validates repository/service `statusCode: 404` is mapped to HTTP `404` with `Receipt not found`.

This adds high-signal guardrails around a core printing read path and its error contract.

## 2) Legal closure monthly report allow-path

Extended `legalArchiveClosure.permissions.test.ts` with allow-path for:

- `GET /closure/monthly-latest` when `access_closure` is granted.
- Assertion that closure bulletin retrieval is establishment-scoped and monthly-typed:
  - `getClosureBulletins(EST, 'MONTHLY')`.

This complements existing deny/allow tests on closure bulletins and expands legal route confidence for monthly reporting.

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/routes/printing.routes.test.ts src/routes/legal/legalArchiveClosure.permissions.test.ts src/routes/legal/legalPermissionGates.test.ts src/models/legalJournal/journalSigning.integrity.test.ts src/printing/printingConfigRepo.test.ts` ✅  
   - Result: 5 files passed, 23 tests passed.

2. `npm run type-check` ✅  
   - Result: TypeScript no-emit check passed.

3. Lint diagnostics on touched files ✅  
   - No linter errors.

## Outcome

P2-8 Pass 4 is complete:
- printing preview route contracts are now better protected,
- legal closure monthly report allow-path has explicit regression coverage,
- C5 test expansion remains focused on tenant and fiscal-sensitive behavior.
