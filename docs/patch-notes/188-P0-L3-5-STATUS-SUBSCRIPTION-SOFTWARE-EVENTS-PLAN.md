# 188 - P0-L3.5 (Status/Subscription Software Events) - Plan

Date: 2026-04-30  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (L3 continuation)

## Why this patch exists

L3.4 covered establishment create/delete events.
The next gap is establishment state transitions:

- activation during setup/account-completion flows,
- explicit status updates in account-creation data operations,
- subscription field transitions (`subscription_plan`, `subscription_status`).

These are governance-critical software events.

## Beginner-friendly framing

An establishment can move through states like:

- `pending_setup` -> `active`,
- or subscription state updates (`active`, `suspended`, `cancelled`).

If these transitions are not software-event journaled, we miss a key part of
"what changed in the system behavior and access envelope."

## Scope

### In scope

1. Extend software-event type catalog with transition-focused events.
2. Hook status transitions in active service paths:
   - `establishmentAccountCreation/database/EstablishmentOperations`
   - `setup/establishmentOperations.activateEstablishment`
3. Hook subscription transitions in `EstablishmentModel.updateEstablishment`.
4. Add focused regression tests for new hooks.
5. Document implementation and verification.

### Out of scope

- Time-drift detection and timezone-change event polling logic.
- Global event-schema normalization across all prior L3 patches.

## Design choices

1. **Service/model-level hooks where transitions actually happen**
   - Avoid route-only assumptions for state changes occurring inside orchestrators.

2. **Best-effort logging**
   - Transition operations should not fail solely due to software-event append issues.

3. **Targeted event names**
   - `ESTABLISHMENT_STATUS_UPDATED`
   - `ESTABLISHMENT_SUBSCRIPTION_UPDATED`

## Step-by-step strategy

### Step 1 - Event type extension

File:
- `backend/src/services/legal/softwareEventJournal.ts`

Plan:
- Add status/subscription event literals.

### Step 2 - Status transition hooks

Files:
- `backend/src/services/establishmentAccountCreation/database/EstablishmentOperations.ts`
- `backend/src/services/setup/establishmentOperations.ts`

Plan:
- On successful status updates/activation, append `ESTABLISHMENT_STATUS_UPDATED`
  with establishment id, new status, and source/update type metadata.

### Step 3 - Subscription transition hooks

File:
- `backend/src/models/establishment.ts`

Plan:
- In `updateEstablishment(...)`, when `subscription_plan` and/or `subscription_status` are provided,
  append `ESTABLISHMENT_SUBSCRIPTION_UPDATED` with changed fields.

### Step 4 - Tests

Files:
- `backend/src/services/establishmentAccountCreation/database/EstablishmentOperations.softwareEvents.test.ts` (new)
- `backend/src/services/setup/establishmentOperations.softwareEvents.test.ts` (new)
- `backend/src/models/establishment.softwareEvents.test.ts` (new)

Plan:
- Assert hooks call `logSoftwareEventBestEffort(...)` with expected event type + payload.

### Step 5 - Verify

Run:
- targeted new tests,
- backend type-check,
- lint diagnostics.

## Acceptance criteria

1. Status transitions in active setup/account flows emit software events.
2. Subscription updates emit software events.
3. Regression tests prove hooks.
4. Plan + implementation patch notes are added.
