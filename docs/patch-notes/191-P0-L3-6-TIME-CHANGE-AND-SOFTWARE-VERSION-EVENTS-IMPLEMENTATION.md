# 191 - P0-L3.6 (Time-Change + Software-Version Events) - Implementation

Date: 2026-04-30  
Plan reference: `docs/patch-notes/190-P0-L3-6-TIME-CHANGE-AND-SOFTWARE-VERSION-EVENTS-PLAN.md`

## What was implemented

This pass closes the remaining L3 software-event scope for:

- runtime time-change visibility,
- software version reporting.

## 1) Software-event type catalog extended

Updated:
- `MuseBar/backend/src/services/legal/softwareEventJournal.ts`

Added event literals:
- `SYSTEM_TIME_CHANGE_DETECTED`
- `SYSTEM_TIMEZONE_OFFSET_CHANGED`
- `SOFTWARE_VERSION_REPORTED`

## 2) Time-change monitor service added

New:
- `MuseBar/backend/src/services/legal/timeChangeMonitor.ts`

Capabilities:
- periodic wall-clock interval checks,
- detection of abnormal time jumps (forward/backward),
- detection of timezone-offset changes for configured app timezone,
- journaling through
  `logSoftwareEventForAllEstablishmentsBestEffort(...)`.

Events emitted:
- `SYSTEM_TIME_CHANGE_DETECTED`
- `SYSTEM_TIMEZONE_OFFSET_CHANGED`

## 3) App lifecycle wiring updated

Updated:
- `MuseBar/backend/src/app.ts`

Changes:
- added `APP_VERSION` derivation via env fallback:
  - `APP_VERSION`,
  - `npm_package_version`,
  - fallback `'unknown'`.
- startup now emits:
  - `SERVER_STARTED` (existing, now enriched with `app_version`),
  - `SOFTWARE_VERSION_REPORTED` (new explicit version breadcrumb).
- starts `TimeChangeMonitor` after server boot.
- stops `TimeChangeMonitor` in graceful shutdown path.

## 4) Regression tests added

New:
- `MuseBar/backend/src/services/legal/timeChangeMonitor.test.ts`

Covered behavior:
- no event under normal interval progression,
- `SYSTEM_TIME_CHANGE_DETECTED` on large clock jump,
- `SYSTEM_TIMEZONE_OFFSET_CHANGED` on offset transition.

Also re-ran:
- `softwareEventJournal.runtime.test.ts`

## Verification

Executed:

1. `npm run test -- src/services/legal/timeChangeMonitor.test.ts src/services/legal/softwareEventJournal.runtime.test.ts`
   - Result: 2 files passed, 6 tests passed.

2. `npm run type-check`
   - Result: success.

3. Lint diagnostics on touched files
   - Result: no linter errors.

## Notes

- This is best-effort observability journaling, consistent with prior L3 passes:
  operations are not made fail-closed by software-event append errors.
