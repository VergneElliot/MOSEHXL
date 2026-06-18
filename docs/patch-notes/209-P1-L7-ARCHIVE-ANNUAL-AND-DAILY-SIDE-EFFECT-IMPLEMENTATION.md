# 209 - P1-L7 (ArchiveService ANNUAL + DAILY side-effect removal) - Implementation

Date: 2026-04-30  
Plan reference: `docs/patch-notes/208-P1-L7-ARCHIVE-ANNUAL-AND-DAILY-SIDE-EFFECT-PLAN.md`

## What was implemented

This patch closes P1-L7 by making archive generation read-only and complete for
all declared export types.

## 1) DAILY export no longer creates closure bulletins

Updated:
- `MuseBar/backend/src/models/archiveService.ts`

Changes:
1. Removed `DAILY` side-effect call to `LegalJournalModel.createDailyClosure(...)`.
2. DAILY payload is now built from read operations only:
   - `LegalJournalModel.getEntriesForPeriod(...)`
   - `LegalJournalModel.getClosureBulletins(..., 'DAILY')` (optional matching closure metadata)
3. Added explicit guard for missing `period_start` in DAILY exports.

Result:
- Export no longer mutates fiscal closure state.
- Closure creation remains in closure endpoints only.

## 2) Added missing ANNUAL export handling

Updated:
- `MuseBar/backend/src/models/archiveService.ts`

Changes:
1. Added a dedicated `ANNUAL` branch in `generateExportContent(...)`.
2. Derives full-year boundaries from `period_start` year.
3. Loads yearly entries and computes sales summary (`SALE` entries).
4. Includes optional matching annual closure bulletin metadata.

Result:
- `ANNUAL` no longer falls through to an empty payload path.

## 3) UTC-normalized period boundaries

Updated:
- `MuseBar/backend/src/models/archiveService.ts`

Changes:
1. Daily/monthly boundaries now use UTC setters.
2. Annual boundaries now use `Date.UTC(...)`.

Result:
- Deterministic period start/end across server timezones.
- Regression test stability and consistent legal export windows.

## 4) CSV serializer parity

Updated:
- `MuseBar/backend/src/models/archiveService.ts`

Change:
- Added `ANNUAL` branch in `convertToCSV(...)` with the same summary columns used
  by monthly output.

## 5) Regression tests added

New:
- `MuseBar/backend/src/models/archiveService.generateExportContent.test.ts`

Coverage:
1. DAILY export:
   - verifies no `createDailyClosure` call occurs,
   - verifies summary fields are computed from journal entries.
2. ANNUAL export:
   - verifies export type and year boundaries,
   - verifies yearly summary generation.

## Verification

Executed:

1. `npm run test -- src/models/archiveService.generateExportContent.test.ts src/routes/legal/legalArchiveClosure.permissions.test.ts`
   - Result: 2 files passed, 20 tests passed.

2. `npm run type-check`
   - Result: success.

3. Lint diagnostics on touched files
   - Result: no linter errors.

## Outcome

P1-L7 is complete:
- archive generation now supports `ANNUAL`,
- daily exports are read-only and no longer trigger closure creation as side effect,
- behavior is locked with focused regression tests.
