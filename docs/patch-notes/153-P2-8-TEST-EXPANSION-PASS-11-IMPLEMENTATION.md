# 153 - P2-8 (Test Expansion Pass 11) - Implementation

Date: 2026-04-29  
Related plan: `docs/patch-notes/152-P2-8-TEST-EXPANSION-PASS-11-PLAN.md`

## What was implemented

Updated tests:

1. `MuseBar/backend/src/routes/legal/legalPermissionGates.test.ts`
2. `MuseBar/backend/src/routes/printing.routes.test.ts`

## 1) Legal compliance route allow-path expansion

Extended `legalPermissionGates.test.ts` with:

- `GET /compliance/status` allow-path under `access_compliance`:
  - asserts establishment-scoped collaborator calls:
    - `verifyJournalIntegrity(EST)`,
    - `getClosureBulletins(EST, 'DAILY')`,
  - asserts response includes `COMPLIANT` status and `COMPLETED` daily closure state.

- `GET /compliance/requirements` allow-path:
  - asserts `200` response,
  - asserts requirements payload shape is present and non-empty.

This complements existing report-path and deny-path coverage in compliance routes.

## 2) Printing test-route error contract coverage

Extended `printing.routes.test.ts` with:

- `POST /printing/test` failure path:
  - forces service acquisition failure,
  - asserts route returns `500` with `Test print failed`,
  - asserts error message propagation contains root failure text.

This locks the operational error contract for the test-print endpoint.

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/routes/printing.routes.test.ts src/routes/legal/legalArchiveClosure.permissions.test.ts src/routes/legal/legalPermissionGates.test.ts src/models/legalJournal/journalSigning.integrity.test.ts src/printing/printingConfigRepo.test.ts` ✅  
   - Result: 5 files passed, 45 tests passed.

2. `npm run type-check` ✅  
   - Result: TypeScript no-emit check passed.

3. Lint diagnostics on touched files ✅  
   - No linter errors.

## Outcome

P2-8 Pass 11 is complete:
- legal compliance route coverage now includes status and requirements allow-path contracts,
- printing test endpoint has explicit failure-path regression protection,
- C5 test posture continues to improve with both positive and negative route contracts.
