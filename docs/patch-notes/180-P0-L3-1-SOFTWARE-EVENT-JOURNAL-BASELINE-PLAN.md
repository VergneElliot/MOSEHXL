# 180 - P0-L3.1 (Software Event Journal Baseline) - Plan

Date: 2026-04-30  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (L3)

## Why this patch exists

The audit flagged a missing NF525-aligned capability: no software-event journal.
As discussed, this is larger than the other P0 fixes, so it is split into incremental phases.

This patch is **L3.1**: baseline event model + first high-value event hooks.

## Phased rollout

- **L3.1 (this patch):** foundation and establishment-scoped configuration events.
- **L3.2:** runtime lifecycle events (startup/shutdown/scheduler) with clear tenant-scoping design.
- **L3.3:** broader software/config events (permission model changes, establishment settings extensions, optional time-change detection).

## Beginner-friendly framing

We already log sales/refunds/closures in the legal journal, but the software itself
also performs actions that matter for fiscal traceability (changing printer config,
changing automated pricing rules, etc.).

L3.1 adds a clean way to write those as journal events and wires the first two places
where operators change behavior-critical configuration.

## Scope

### In scope

1. Add a dedicated software-event logging method on legal-journal model layer.
2. Add a reusable best-effort helper for software-event journaling.
3. Wire helper into:
   - `POST /api/printing/configuration`
   - `PUT /api/settings/happy-hour`
4. Add regression tests for new hooks.
5. Document implementation and verification.

### Out of scope

- Startup/shutdown journaling (requires explicit multi-tenant strategy in a process-level context).
- Time-change detection.
- Full event taxonomy for every route in the system.

## Design choices

1. **Use existing legal_journal schema (no migration in L3.1)**
   - Represent software events via `transaction_type = 'CORRECTION'` with:
     - `correction_type = 'SOFTWARE_EVENT'`
     - `software_event_type = <event-name>`
   - This keeps chain integrity and avoids risky schema migration in the first step.

2. **Best-effort logging for config hooks**
   - Configuration update should not fail solely because software-event append failed.
   - Errors are logged with context.
   - Later phase can revisit strict coupling for selected critical events.

3. **Small, explicit event names**
   - `PRINTING_CONFIGURATION_UPDATED`
   - `HAPPY_HOUR_SETTINGS_UPDATED`

## Step-by-step strategy

### Step 1 - Model capability

Files:
- `backend/src/models/legalJournal/journalOperations.ts`
- `backend/src/models/legalJournal/index.ts`

Plan:
- Add `logSoftwareEvent(establishmentId, eventType, eventData, userId?)`.
- Internally append via `CORRECTION` entry with normalized payload:
  - `correction_type: 'SOFTWARE_EVENT'`
  - `software_event_type`
  - `event_data`
  - `register_id`.

### Step 2 - Reusable helper

File:
- `backend/src/services/legal/softwareEventJournal.ts` (new)

Plan:
- Export typed helper `logSoftwareEventBestEffort(...)`.
- Catch and log failures (no throw), include event type + establishment in logs.

### Step 3 - Route wiring

Files:
- `backend/src/routes/printing.ts`
- `backend/src/routes/settings.ts`

Plan:
- On successful printing configuration update, append software event with provider and config metadata.
- On successful happy-hour settings save, append software event with updated schedule/override fields.

### Step 4 - Tests

Files:
- `backend/src/routes/printing.routes.test.ts` (extend)
- `backend/src/routes/settings.softwareEvents.test.ts` (new)

Plan:
- Printing route test: assert event helper called on successful config update.
- Settings route test: assert helper called on happy-hour update success.

### Step 5 - Verify

Run:
- targeted tests for printing/settings software event hooks,
- backend type-check,
- lints for edited files.

## Acceptance criteria

1. Software-event journal API exists in legal-journal model layer.
2. Printing config update writes software-event journal (best effort).
3. Happy-hour settings update writes software-event journal (best effort).
4. Tests verify hooks.
5. Plan + implementation patch notes added.

## Risks and mitigations

- Risk: event volume growth.
  - Mitigation: start with two events only; expand gradually in L3.2/L3.3.
- Risk: best-effort could miss some events on transient DB errors.
  - Mitigation: strong error logs + future strictness options where needed.
