# 141 - P2-8 (Test Expansion Pass 5) - Implementation

Date: 2026-04-29  
Related plan: `docs/patch-notes/140-P2-8-TEST-EXPANSION-PASS-5-PLAN.md`

## What was implemented

Updated tests:

1. `MuseBar/backend/src/routes/printing.routes.test.ts`
2. `MuseBar/backend/src/routes/legal/legalArchiveClosure.permissions.test.ts`

## 1) Printing route not-found contract coverage

Extended `printing.routes.test.ts` with:

- `POST /printing/receipt/:orderId` not-found mapping:
  - when receipt data build raises `statusCode: 404`, route returns HTTP 404 with `Receipt not found`.

- `POST /printing/closure/:bulletinId` not-found mapping:
  - when closure bulletin data build raises `statusCode: 404`, route returns HTTP 404 with `Closure bulletin not found`.

This hardens printing-route contract stability for client flows that rely on specific not-found semantics.

## 2) Legal closure today-status allow-path and response shaping

Extended `legalArchiveClosure.permissions.test.ts` with:

- allow-path for `GET /closure/today-status` when `access_closure` is present.
- establishment-scoped assertions:
  - `getClosureBulletins(EST, 'DAILY')`,
  - `getLastFondDeCaisse(EST)`.
- response-shaping assertion:
  - `total_transactions` is omitted from returned `bulletin` payload, as intended by route behavior.

This locks down one more compliance-sensitive status/report path used by legal closure UI checks.

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/routes/printing.routes.test.ts src/routes/legal/legalArchiveClosure.permissions.test.ts src/routes/legal/legalPermissionGates.test.ts src/models/legalJournal/journalSigning.integrity.test.ts src/printing/printingConfigRepo.test.ts` ✅  
   - Result: 5 files passed, 26 tests passed.

2. `npm run type-check` ✅  
   - Result: TypeScript no-emit check passed.

3. Lint diagnostics on touched files ✅  
   - No linter errors.

## Outcome

P2-8 Pass 5 is complete:
- printing not-found behavior is now explicitly regression-tested for receipt and closure print routes,
- legal closure `today-status` allow-path and payload redaction behavior are now covered,
- C5 test expansion continues reducing risk on fiscal/tenant-sensitive route contracts.
