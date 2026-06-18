# 165 - P2-8 (Test Expansion Pass 17) - Implementation

Date: 2026-04-29  
Related plan: `docs/patch-notes/164-P2-8-TEST-EXPANSION-PASS-17-PLAN.md`

## What was implemented

Updated tests:

1. `MuseBar/backend/src/routes/legal/legalPermissionGates.test.ts`

## 1) Journal entries route coverage expansion

Extended `legalPermissionGates.test.ts` with:

- `GET /journal/entries` deny-path without `access_compliance`:
  - asserts `403`,
  - asserts `getEntriesWithCountForPeriod` is not called.

- `GET /journal/entries` allow-path with `access_compliance`:
  - sends explicit date + pagination query parameters,
  - asserts scoped query invocation:
    - `establishment_id: EST`,
    - `start_date` / `end_date`,
    - parsed numeric `limit` / `offset`,
  - asserts response pagination/total contract.

This closes a key compliance-route contract gap for journal entry retrieval.

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/routes/printing.routes.test.ts src/routes/legal/legalArchiveClosure.permissions.test.ts src/routes/legal/legalPermissionGates.test.ts src/models/legalJournal/journalSigning.integrity.test.ts src/printing/printingConfigRepo.test.ts` ✅  
   - Result: 5 files passed, 62 tests passed.

2. `npm run type-check` ✅  
   - Result: TypeScript no-emit check passed.

3. Lint diagnostics on touched files ✅  
   - No linter errors.

## Outcome

P2-8 Pass 17 is complete:
- journal entries permission and scoped query behavior now have explicit regression guards,
- C5 route-level coverage is now stronger on legal reporting read paths.
