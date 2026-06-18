# 147 - P2-8 (Test Expansion Pass 8) - Implementation

Date: 2026-04-29  
Related plan: `docs/patch-notes/146-P2-8-TEST-EXPANSION-PASS-8-PLAN.md`

## What was implemented

Updated files:

1. `MuseBar/backend/src/routes/printing.ts`
2. `MuseBar/backend/src/routes/printing.routes.test.ts`
3. `MuseBar/backend/src/routes/legal/legalArchiveClosure.permissions.test.ts`

## 1) Printing POST route validation hardening

Updated `printing.ts` to enforce explicit numeric/positive id validation on POST print routes:

- `POST /printing/receipt/:orderId`
  - invalid id now returns `400` with `Invalid order id`.

- `POST /printing/closure/:bulletinId`
  - invalid id now returns `400` with `Invalid closure bulletin id`.

This aligns command-route behavior with existing preview route validation standards.

## 2) Printing invalid-id regression coverage

Extended `printing.routes.test.ts` with:

- invalid receipt print id test:
  - `POST /printing/receipt/not-a-number` => `400`,
  - asserts `buildReceiptDataForOrder` is not called.

- invalid closure print id test:
  - `POST /printing/closure/not-a-number` => `400`,
  - asserts `buildClosureBulletinData` is not called.

## 3) Legal archive invalid-id regression coverage

Extended `legalArchiveClosure.permissions.test.ts` with:

- invalid id path for `GET /archive/:id` under permitted user:
  - `GET /archive/not-a-number` => `400 Invalid archive ID`,
  - asserts `getArchiveExportById` is not called.

This strengthens defensive contract behavior on legal archive detail retrieval.

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/routes/printing.routes.test.ts src/routes/legal/legalArchiveClosure.permissions.test.ts src/routes/legal/legalPermissionGates.test.ts src/models/legalJournal/journalSigning.integrity.test.ts src/printing/printingConfigRepo.test.ts` ✅  
   - Result: 5 files passed, 35 tests passed.

2. `npm run type-check` ✅  
   - Result: TypeScript no-emit check passed.

3. Lint diagnostics on touched files ✅  
   - No linter errors.

## Outcome

P2-8 Pass 8 is complete:
- printing POST routes now reject invalid ids deterministically with `400`,
- regression coverage locks invalid-id behavior for printing and legal archive detail routes,
- C5 route-contract reliability is improved on both compliance and operational paths.
