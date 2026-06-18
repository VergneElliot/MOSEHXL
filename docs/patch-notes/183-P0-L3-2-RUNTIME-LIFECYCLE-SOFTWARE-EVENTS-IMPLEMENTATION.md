# 183 - P0-L3.2 (Runtime Lifecycle Software Events) - Implementation

Date: 2026-04-30  
Related plan: `docs/patch-notes/182-P0-L3-2-RUNTIME-LIFECYCLE-SOFTWARE-EVENTS-PLAN.md`

## What was implemented

This patch extends software-event journaling from request-level configuration changes (L3.1) to process/runtime lifecycle events.

---

## 1) Extended software-event service for lifecycle fan-out

Updated:
- `MuseBar/backend/src/services/legal/softwareEventJournal.ts`

Changes:
- Added runtime event types:
  - `SERVER_STARTED`
  - `SERVER_SHUTDOWN`
  - `AUTO_CLOSURE_SCHEDULER_STARTED`
  - `AUTO_CLOSURE_SCHEDULER_START_FAILED`
- Added establishment fan-out helper:
  - `logSoftwareEventForAllEstablishmentsBestEffort(eventType, eventData, userId?)`
- Helper behavior:
  - queries establishment ids (`SELECT id FROM establishments`),
  - appends event for each establishment via existing best-effort writer,
  - catches/logs enumeration failures.

Result:
- Runtime events can be journaled in tenant-scoped legal journals without request context.

---

## 2) Wired app startup/shutdown/scheduler lifecycle events

Updated:
- `MuseBar/backend/src/app.ts`

Changes:
- Added `logRuntimeLifecycleEvent(...)` helper in app bootstrap path.
- On server start (`app.listen` callback):
  - logs `SERVER_STARTED` fan-out event.
- In production scheduler startup path:
  - on success logs `AUTO_CLOSURE_SCHEDULER_STARTED`,
  - on failure logs `AUTO_CLOSURE_SCHEDULER_START_FAILED` with error details.
- Added graceful signal handling:
  - handles `SIGINT` and `SIGTERM`,
  - stops closure scheduler,
  - logs `SERVER_SHUTDOWN`,
  - closes HTTP server and exits.
- Added shutdown re-entry guard (`isShuttingDown`) to avoid duplicate signal handling.

Result:
- Core runtime lifecycle actions are now software-event journaled per establishment.

---

## 3) Added runtime helper regression tests

Added:
- `MuseBar/backend/src/services/legal/softwareEventJournal.runtime.test.ts`

Coverage:
1. fan-out logs events for all establishment ids returned by query.
2. establishment enumeration failure is swallowed/logged (no throw).
3. single establishment event append failure is swallowed/logged (no throw).

Also re-ran L3.1 route tests to ensure no regressions in existing hooks.

---

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/services/legal/softwareEventJournal.runtime.test.ts src/routes/printing.routes.test.ts src/routes/settings.softwareEvents.test.ts` ✅
   - Result: 3 files passed, 31 tests passed.

2. `npm run type-check` ✅
   - Result: TypeScript no-emit check passed.

3. Lints check (edited files) ✅
   - No linter errors on:
     - `services/legal/softwareEventJournal.ts`
     - `services/legal/softwareEventJournal.runtime.test.ts`
     - `app.ts`
     - `182-P0-L3-2-...-PLAN.md`

---

## Outcome

L3.2 is implemented:

- runtime lifecycle software events are journaled in tenant scope,
- server startup/shutdown/scheduler outcomes now leave legal-journal traces,
- behavior is regression-tested and fails safely.

## Next phase (L3.3)

Suggested scope:
- expand software-event coverage to additional critical configuration domains
  (permissions model changes, establishment status transitions, auth security toggles),
- add event schema standardization docs (required keys by event class).
