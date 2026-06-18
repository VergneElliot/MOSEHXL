# 187 - P0-L3.4 (Establishment Lifecycle Software Events) - Implementation

Date: 2026-04-30  
Related plan: `docs/patch-notes/186-P0-L3-4-ESTABLISHMENT-LIFECYCLE-SOFTWARE-EVENTS-PLAN.md`

## What was implemented

L3.4 extends software-event journaling to establishment lifecycle mutations on the active `enhancedEstablishments` route surface.

---

## 1) Extended software-event type catalog

Updated:
- `MuseBar/backend/src/services/legal/softwareEventJournal.ts`

Added event types:
- `ESTABLISHMENT_CREATED`
- `ESTABLISHMENT_DELETED`

Result:
- Establishment lifecycle hooks can use typed event names consistently.

---

## 2) Wired lifecycle hooks in establishment routes

Updated:
- `MuseBar/backend/src/routes/enhancedEstablishments.ts`

Changes:

1. `POST /api/establishments`
   - After successful orchestrator creation, route appends software event:
     - `eventType: ESTABLISHMENT_CREATED`
     - `establishmentId: created establishment id`
     - `userId: current actor id`
     - `eventData: { establishment_id, establishment_name }`

2. `DELETE /api/establishments/:id`
   - After successful deletion, route appends software event:
     - `eventType: ESTABLISHMENT_DELETED`
     - `establishmentId: route id`
     - `userId: current actor id`
     - `eventData: { establishment_id }`

Both hooks use `logSoftwareEventBestEffort(...)`.

Result:
- Establishment create/delete actions now emit legal-journal software events.

---

## 3) Added route-level regression tests

Added:
- `MuseBar/backend/src/routes/enhancedEstablishments.softwareEvents.test.ts`

Coverage:
- create path logs `ESTABLISHMENT_CREATED` with expected payload.
- delete path logs `ESTABLISHMENT_DELETED` with expected payload.

Test isolation note:
- The test mocks `../app` directly to avoid importing full app bootstrap graph.

---

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/routes/enhancedEstablishments.softwareEvents.test.ts` ✅
   - Result: 1 file passed, 2 tests passed.

2. `npm run type-check` ✅
   - Result: TypeScript no-emit check passed.

3. Lints check (edited files) ✅
   - No linter errors on:
     - `services/legal/softwareEventJournal.ts`
     - `routes/enhancedEstablishments.ts`
     - `routes/enhancedEstablishments.softwareEvents.test.ts`
     - `186-P0-L3-4-...-PLAN.md`

---

## Outcome

L3.4 is implemented:

- establishment lifecycle mutations are now software-event journaled,
- hooks are route-tested,
- API response contracts remain unchanged.

## Suggested next increment (L3.5)

- status/subscription transition software events (e.g. `active`/`suspended` transitions),
- optional time-change/tz-change event coverage.
