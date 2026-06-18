# 247 - P2-S8/S9 (journal stats permission consistency) - Implementation

Date: 2026-05-01  
Related plan: `docs/patch-notes/246-P2-S8-S9-JOURNAL-STATS-PERMISSION-CONSISTENCY-PLAN.md`

## What changed

## 1) Regression coverage for the chosen `/journal/stats` contract

Updated:
- `MuseBar/backend/src/routes/legal/legalPermissionGates.test.ts`

Changes:
1. Added explicit mock handle for `JournalQueries.getJournalStatsSummary`.
2. Extended token helper to generate `system_admin` tokens with nullable
   `establishment_id`.
3. Added test:
   - allows `/journal/stats` for `establishment_admin` with
     `access_compliance`.
4. Added test:
   - denies `/journal/stats` (403) for `system_admin` with
     `access_compliance` when token has no `establishment_id` context.

## Why this closes S8/S9

1. S9 (inconsistent permission story): `/journal/stats` is now explicitly locked
   in tests to the same permission model as `/journal/entries` and `/journal/verify`
   (`access_compliance`).
2. S8 (broken role/scope combo): tests now explicitly codify scope behavior:
   this is establishment-scoped stats, so null establishment context is rejected.

## Verification

Executed:
1. `npm run test -- src/routes/legal/legalPermissionGates.test.ts`
   - Result: pass (`1` file, `20` tests).
2. Lint diagnostics on touched files:
   - Result: no issues.

## Result

S8/S9 are closed with an explicit, regression-tested contract for legal journal
stats authorization and scope handling.
