# 137 - P2-8 (Test Expansion Pass 3) - Implementation

Date: 2026-04-29  
Related plan: `docs/patch-notes/136-P2-8-TEST-EXPANSION-PASS-3-PLAN.md`

## What was implemented

Updated tests:

1. `MuseBar/backend/src/routes/printing.routes.test.ts`
2. `MuseBar/backend/src/routes/legal/legalArchiveClosure.permissions.test.ts`

## 1) Printing history tenant-isolation depth

Extended `printing.routes.test.ts` with:

- `GET /printing/history` route test asserting:
  - tenant-scoped SQL (`WHERE establishment_id = $1`) with caller establishment id,
  - bounded pagination behavior (`limit` clamped to `500`),
  - response shape (`history`, `total`, `limit`, `offset`).

This locks a critical printing-history tenant scope and pagination guard at route level.

## 2) Legal closure allow-path coverage

Extended `legalArchiveClosure.permissions.test.ts` with:

- allow-path for `GET /closure/bulletins` when `access_closure` is granted.
- assertion that closure bulletins fetch is scoped to caller establishment id.
- response total assertion.

This complements existing deny-path tests with a positive-path compliance regression guard.

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/routes/printing.routes.test.ts src/routes/legal/legalArchiveClosure.permissions.test.ts src/routes/legal/legalPermissionGates.test.ts src/models/legalJournal/journalSigning.integrity.test.ts src/printing/printingConfigRepo.test.ts` ✅  
   - Result: 5 files passed, 20 tests passed.

2. `npm run type-check` ✅  
   - Result: TypeScript no-emit check passed.

3. Lint diagnostics on touched files ✅  
   - No linter errors.

## Outcome

P2-8 Pass 3 is complete:
- deeper printing history tenant-scope behavior is now guarded,
- legal closure route testing now covers both deny and allow paths,
- C5 test posture continues improving on fiscal/tenant-sensitive areas.
