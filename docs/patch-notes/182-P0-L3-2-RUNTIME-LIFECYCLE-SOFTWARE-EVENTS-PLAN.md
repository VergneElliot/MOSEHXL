# 182 - P0-L3.2 (Runtime Lifecycle Software Events) - Plan

Date: 2026-04-30  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (L3)

## Why this patch exists

L3.1 introduced software-event journaling for request-driven configuration changes.
L3.2 extends this to process/runtime lifecycle events:

- server start,
- server shutdown,
- automatic closure scheduler start success/failure.

These events are relevant for fiscal traceability and operational audit narratives.

## Beginner-friendly framing

Request routes already know "which establishment" performed an action.
Process lifecycle events happen outside a request, so we must choose a tenant-scope strategy.

L3.2 uses this rule:

- enumerate establishments,
- append one software event per establishment.

This keeps the legal journal tenant-scoped while still recording system lifecycle facts.

## Scope

### In scope

1. Add helper to fan out a software-event entry to all establishments.
2. Wire app lifecycle hooks:
   - `SERVER_STARTED`
   - `SERVER_SHUTDOWN`
   - `AUTO_CLOSURE_SCHEDULER_STARTED`
   - `AUTO_CLOSURE_SCHEDULER_START_FAILED`
3. Add graceful signal handlers (`SIGINT`, `SIGTERM`) that:
   - stop closure scheduler,
   - append shutdown events,
   - close HTTP server.
4. Add regression tests for lifecycle helper behavior.
5. Document implementation and verification.

### Out of scope

- Time-drift detection events.
- Per-route event coverage beyond L3.1 hooks.
- Cross-process deduplication strategy for multi-instance deployments.

## Design choices

1. **Tenant fan-out helper**
   - Query `SELECT id FROM establishments`.
   - Append same lifecycle event for each establishment.

2. **Best-effort logging**
   - Lifecycle logging should never crash startup/shutdown paths.
   - Failures are logged and execution continues.

3. **Minimal runtime behavior change**
   - Existing scheduler start policy remains unchanged.
   - Add event instrumentation around existing behavior.

## Step-by-step strategy

### Step 1 - Extend software-event service

File:
- `backend/src/services/legal/softwareEventJournal.ts`

Plan:
- Add event types for runtime lifecycle.
- Add `logSoftwareEventForAllEstablishmentsBestEffort(...)`.

### Step 2 - Wire app lifecycle hooks

File:
- `backend/src/app.ts`

Plan:
- On server listen callback:
  - log `SERVER_STARTED`,
  - then log scheduler-start outcome in production.
- Add shutdown handler:
  - on `SIGINT`/`SIGTERM`, stop scheduler, log `SERVER_SHUTDOWN`, close server.

### Step 3 - Tests

File:
- `backend/src/services/legal/softwareEventJournal.runtime.test.ts` (new)

Plan:
- verify fan-out to all establishments,
- verify query failure is swallowed/logged,
- verify single-event append failure is swallowed/logged.

### Step 4 - Verify

Run:
- targeted software-event tests (new + L3.1 route tests),
- backend type-check,
- lint diagnostics for edited files.

## Acceptance criteria

1. Runtime lifecycle events are journaled per establishment.
2. Startup/shutdown/scheduler events are emitted best-effort without breaking server lifecycle.
3. Tests pass and confirm fan-out behavior.
4. Plan + implementation patch notes are added.
