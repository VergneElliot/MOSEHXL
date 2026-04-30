# 181 - P0-L3.1 (Software Event Journal Baseline) - Implementation

Date: 2026-04-30  
Related plan: `docs/patch-notes/180-P0-L3-1-SOFTWARE-EVENT-JOURNAL-BASELINE-PLAN.md`

## What was implemented

This patch establishes the first production baseline for software-event journaling and wires two high-value configuration-change hooks.

---

## 1) Added software-event capability in legal-journal model layer

Updated:
- `MuseBar/backend/src/models/legalJournal/journalOperations.ts`
- `MuseBar/backend/src/models/legalJournal/index.ts`

Changes:
- Added `JournalOperations.logSoftwareEvent(...)`.
- Added `LegalJournalModel.logSoftwareEvent(...)` compatibility proxy.

Implementation details:
- Software events are appended as legal-journal entries using:
  - `transaction_type: 'CORRECTION'`
  - `correction_type: 'SOFTWARE_EVENT'`
  - `software_event_type: <event-name>`
  - `event_data: <payload>`
  - `register_id`
- Amount/VAT are set to `0` (non-financial event marker).

Result:
- Application code now has a dedicated API for writing establishment-scoped software events to the legal journal stream.

---

## 2) Added reusable best-effort helper for software-event journaling

Added:
- `MuseBar/backend/src/services/legal/softwareEventJournal.ts`

Exports:
- `SoftwareEventType` union:
  - `PRINTING_CONFIGURATION_UPDATED`
  - `HAPPY_HOUR_SETTINGS_UPDATED`
- `logSoftwareEventBestEffort(...)`

Behavior:
- Calls `LegalJournalModel.logSoftwareEvent(...)`.
- Catches and logs failures with event + establishment context.
- Does not throw (best-effort strategy for L3.1).

---

## 3) Wired printing configuration updates

Updated:
- `MuseBar/backend/src/routes/printing.ts`

Change:
- On successful `POST /api/printing/configuration`, route now appends:
  - `eventType: PRINTING_CONFIGURATION_UPDATED`
  - `establishmentId`
  - `userId`
  - event data (`provider`, `has_config_payload`).

Result:
- Printing provider changes are now journaled as software events.

---

## 4) Wired happy-hour settings updates

Updated:
- `MuseBar/backend/src/routes/settings.ts`

Change:
- On successful `PUT /api/settings/happy-hour`, route now appends:
  - `eventType: HAPPY_HOUR_SETTINGS_UPDATED`
  - `establishmentId`
  - `userId`
  - event data (enabled, times, override, discount mode/value).

Result:
- Business-rule settings changes are now journaled as software events.

---

## 5) Added regression tests

Updated:
- `MuseBar/backend/src/routes/printing.routes.test.ts`

Added:
- Assertion in config-update success path that `logSoftwareEventBestEffort(...)` is called with expected event metadata.

Added:
- `MuseBar/backend/src/routes/settings.softwareEvents.test.ts`

Coverage:
- Verifies successful happy-hour update calls:
  - `HappyHourSettingsModel.upsertHappyHourSettings(...)`
  - `logSoftwareEventBestEffort(...)` with `HAPPY_HOUR_SETTINGS_UPDATED`.

---

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/routes/printing.routes.test.ts src/routes/settings.softwareEvents.test.ts` ✅
   - Result: 2 files passed, 28 tests passed.

2. `npm run type-check` ✅
   - Result: TypeScript no-emit check passed.

3. Lints check (edited files) ✅
   - No linter errors on all changed route/model/service/test files.

---

## Outcome

L3.1 is implemented:

- Software-event journaling foundation exists,
- first two real software/config change events are captured,
- behavior is regression-tested and production-safe (best-effort logging).

## Next phase (L3.2)

Planned scope:
- process/runtime lifecycle software events (startup/shutdown/scheduler),
- explicit tenant-scoping strategy for events triggered outside request context.
