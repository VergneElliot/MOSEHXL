# 213 - P1-Q3 (Resolve `useHappyHour` name collision) - Implementation

Date: 2026-04-30  
Plan reference: `docs/patch-notes/212-P1-Q3-HAPPY-HOUR-HOOK-NAME-COLLISION-PLAN.md`

## What was implemented

This patch resolves P1-Q3 by removing the duplicate exported hook name in the
Happy Hour domain.

## 1) Renamed control-module hook export

Updated:
- `MuseBar/src/components/HappyHour/HappyHourControl/useHappyHour.ts`

Change:
- renamed exported hook symbol:
  - from `useHappyHour`
  - to `useHappyHourControl`

Result:
- control-module hook no longer collides by name with app-level
  `src/hooks/useHappyHour.ts`.

## 2) Updated usage and barrel export

Updated:
- `MuseBar/src/components/HappyHour/HappyHourControl/HappyHourControlContainer.tsx`
- `MuseBar/src/components/HappyHour/HappyHourControl/index.ts`

Changes:
1. Container now imports and calls `useHappyHourControl`.
2. Module index now exports `useHappyHourControl`.

Result:
- all local references align with the renamed hook and compile correctly.

## Verification

Executed:

1. `npm run type-check` (frontend workspace `MuseBar/`)
   - Result: success.

2. Lint diagnostics on touched files
   - Result: no linter errors.

## Outcome

P1-Q3 is complete:
- hook naming ambiguity is removed for Happy Hour control logic,
- behavior remains unchanged,
- future imports are clearer and less error-prone.
