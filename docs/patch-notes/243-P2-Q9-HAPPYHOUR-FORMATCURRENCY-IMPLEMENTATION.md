# 243 - P2-Q9 (HappyHour inline currency dedup) - Implementation

Date: 2026-05-01  
Plan reference: `docs/patch-notes/242-P2-Q9-HAPPYHOUR-FORMATCURRENCY-PLAN.md`

## What was implemented

This patch closes P2-Q9 by removing inline Euro formatting logic from the
Happy Hour control hook and using shared currency formatting utility.

## 1) Hook now uses shared formatter

Updated:
- `MuseBar/src/components/HappyHour/HappyHourControl/useHappyHour.ts`

Changes:
1. Imported `formatCurrency` from `src/utils/formatCurrency`.
2. Replaced inline helper:
   - from `` (amount) => `€${amount.toFixed(2)}` ``
   - to shared `formatCurrency`.
3. Updated fixed-discount label branch to use shared formatter instead of raw
   Euro interpolation.

Result:
- no inline Euro formatting remains in this hook,
- output now follows shared locale-aware formatting rules.

## Verification

Executed:

1. Frontend type-check:
   - `npm run type-check`
   - Result: passed.
2. Lint diagnostics on touched files:
   - Result: no lint errors.

## Outcome

P2-Q9 is complete:
- Happy Hour hook currency rendering path now uses single-source formatter,
- formatting consistency is improved without changing hook API shape.
