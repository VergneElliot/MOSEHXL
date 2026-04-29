# 143 - P2-8 (Test Expansion Pass 6) - Implementation

Date: 2026-04-29  
Related plan: `docs/patch-notes/142-P2-8-TEST-EXPANSION-PASS-6-PLAN.md`

## What was implemented

Updated tests:

1. `MuseBar/backend/src/routes/printing.routes.test.ts`
2. `MuseBar/backend/src/routes/legal/legalPermissionGates.test.ts`

## 1) Printing read-path contract expansion

Extended `printing.routes.test.ts` with:

- `GET /printing/configuration` success path:
  - asserts establishment-scoped read behavior,
  - verifies `listPrintingConfigurations(pool, 'est-1')` call and response payload shape.

- `GET /printing/history` invalid pagination fallback:
  - verifies invalid inputs (`limit=-10`, `offset=abc`) are normalized to safe defaults (`limit=50`, `offset=0`),
  - asserts scoped SQL call args (`['est-1', 50, 0]`).

This strengthens route-level guarantees for tenant scoping and defensive pagination handling.

## 2) Legal stats monthly-live allow-path expansion

Extended `legalPermissionGates.test.ts` with:

- allow-path for `GET /stats/monthly-live` when `access_compliance` is present.
- assertions for establishment-scoped repository call inputs:
  - `MonthlyLiveStatsRepository.getOrdersTotalsForPeriod({ establishmentId, start, end })`,
  - `MonthlyLiveStatsRepository.countDailyClosuresForPeriod({ establishmentId, start, end })`.
- response assertions for totals and closure count.

This complements existing deny-path coverage and protects one more compliance reporting route contract.

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/routes/printing.routes.test.ts src/routes/legal/legalArchiveClosure.permissions.test.ts src/routes/legal/legalPermissionGates.test.ts src/models/legalJournal/journalSigning.integrity.test.ts src/printing/printingConfigRepo.test.ts` ✅  
   - Result: 5 files passed, 29 tests passed.

2. `npm run type-check` ✅  
   - Result: TypeScript no-emit check passed.

3. Lint diagnostics on touched files ✅  
   - No linter errors.

## Outcome

P2-8 Pass 6 is complete:
- printing configuration read path and history pagination fallback are now guarded,
- legal monthly-live stats allow-path has explicit permission+scope regression coverage,
- C5 test posture continues to improve around tenant and compliance-sensitive routes.
