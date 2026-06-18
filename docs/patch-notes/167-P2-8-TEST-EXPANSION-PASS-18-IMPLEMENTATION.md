# 167 - P2-8 (Test Expansion Pass 18) - Implementation

Date: 2026-04-29  
Related plan: `docs/patch-notes/166-P2-8-TEST-EXPANSION-PASS-18-PLAN.md`

## What was implemented

Updated tests:

1. `MuseBar/backend/src/routes/legal/legalPermissionGates.test.ts`
2. `MuseBar/backend/src/routes/printing.routes.test.ts`

## 1) Legal journal admin-deny coverage

Extended `legalPermissionGates.test.ts` with:

- `GET /journal/stats` deny-path for non-admin users:
  - asserts `403`.

- `POST /journal/reset` deny-path for non-admin users:
  - asserts `403`.

This closes admin-gated route coverage gaps for journal management surfaces.

## 2) Printing closure command success-path coverage

Extended `printing.routes.test.ts` with:

- `POST /printing/closure/:bulletinId` success path:
  - mocks closure bulletin build + print service success,
  - asserts `200` response and bulletin payload contract,
  - asserts `logPrintingHistory` is called with expected closure metadata:
    - `bulletin_id`,
    - `closure_type`.

This complements existing closure invalid-id and not-found coverage with a positive command-path regression.

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/routes/printing.routes.test.ts src/routes/legal/legalArchiveClosure.permissions.test.ts src/routes/legal/legalPermissionGates.test.ts src/models/legalJournal/journalSigning.integrity.test.ts src/printing/printingConfigRepo.test.ts` ✅  
   - Result: 5 files passed, 65 tests passed.

2. `npm run type-check` ✅  
   - Result: TypeScript no-emit check passed.

3. Lint diagnostics on touched files ✅  
   - No linter errors.

## Outcome

P2-8 Pass 18 is complete:
- legal journal admin-deny contracts now have explicit regression coverage,
- printing closure command route now has success-path and history-log contract protection,
- C5 route-level coverage is now broad across both legal and printing endpoint families.
