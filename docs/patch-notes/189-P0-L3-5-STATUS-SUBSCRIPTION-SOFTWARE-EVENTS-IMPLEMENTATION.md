# 189 - P0-L3.5 (Status/Subscription Software Events) - Implementation

Date: 2026-04-30  
Plan reference: `docs/patch-notes/188-P0-L3-5-STATUS-SUBSCRIPTION-SOFTWARE-EVENTS-PLAN.md`

## What was implemented

This pass extends software-event journaling to establishment transition events.

### 1) Event type catalog extended

Updated:
- `MuseBar/backend/src/services/legal/softwareEventJournal.ts`

Added event literals:
- `ESTABLISHMENT_STATUS_UPDATED`
- `ESTABLISHMENT_SUBSCRIPTION_UPDATED`

### 2) Status transition hooks (account creation + setup)

Updated:
- `MuseBar/backend/src/services/establishmentAccountCreation/database/EstablishmentOperations.ts`
- `MuseBar/backend/src/services/setup/establishmentOperations.ts`

Changes:
- `updateEstablishmentWithBusinessInfo(...)` now appends
  `ESTABLISHMENT_STATUS_UPDATED` after successful business-info completion.
- `updateEstablishmentStatus(...)` now appends
  `ESTABLISHMENT_STATUS_UPDATED` after successful explicit status update.
- `activateEstablishment(...)` now appends
  `ESTABLISHMENT_STATUS_UPDATED` after successful setup activation.

All are best-effort through `logSoftwareEventBestEffort(...)` to avoid blocking
the business operation if software-event logging fails.

### 3) Subscription transition hook

Updated:
- `MuseBar/backend/src/models/establishment.ts`

Change:
- `updateEstablishment(...)` now appends
  `ESTABLISHMENT_SUBSCRIPTION_UPDATED` whenever
  `subscription_plan` and/or `subscription_status` are part of the update payload.

## Regression tests added

New tests:
- `MuseBar/backend/src/services/establishmentAccountCreation/database/EstablishmentOperations.softwareEvents.test.ts`
- `MuseBar/backend/src/services/setup/establishmentOperations.softwareEvents.test.ts`
- `MuseBar/backend/src/models/establishment.softwareEvents.test.ts`

Coverage focus:
- event append invoked with correct event type and payload,
- no subscription event for non-subscription-only updates.

## Verification run

Executed:

1. `npm run test -- src/services/establishmentAccountCreation/database/EstablishmentOperations.softwareEvents.test.ts src/services/setup/establishmentOperations.softwareEvents.test.ts src/models/establishment.softwareEvents.test.ts`
   - Result: 3 files passed, 5 tests passed.

2. `npm run type-check`
   - Result: success.

3. Lint diagnostics check on touched files
   - Result: no linter errors.

## Notes

- Timezone/time-change software events were intentionally left out of this pass;
  this patch focuses only on concrete status/subscription mutation points.
