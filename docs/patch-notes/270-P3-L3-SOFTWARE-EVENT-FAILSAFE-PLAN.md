# 270 - P3-L3 (Software-event journaling fail-safe for critical events) - Plan

Date: 2026-05-20  
Source audit: `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md` (P3-L3)

## Why this patch exists

`services/legal/softwareEventJournal.ts` currently uses best-effort helpers that
swallow all append failures after logging. This means critical lifecycle events
(server start/shutdown, time-change detection, scheduler start outcome, software
version reporting, user-role/permission governance events) can disappear from
the legal journal stream without propagating failure.

The audit flagged this as a Sécurisation gap: software-event loss is silent.

## Scope

### In scope

1. Add retry-based append semantics for software-event journaling.
2. Classify critical software-event types.
3. Add fail-safe helpers that throw when critical event journaling fails
   (single-establishment and all-establishments variants).
4. Keep best-effort helper names for non-critical events, but enforce fail-safe
   behavior for critical types.
5. Update startup lifecycle orchestration (`app.ts`) to fail closed when
   critical startup events cannot be journaled.
6. Add/adjust runtime tests for the new behavior.

### Out of scope

- Persisted dead-letter queue / background replay table.
- Reworking all route handlers to use strict helpers explicitly; this patch
  centralizes critical behavior in the service layer.

## Strategy

### Step 1 - Add retries + critical classification in softwareEventJournal service

In `softwareEventJournal.ts`:

1. Add a critical event set (`CRITICAL_SOFTWARE_EVENTS`) including:
   - server lifecycle (`SERVER_STARTED`, `SERVER_SHUTDOWN`)
   - scheduler lifecycle (`AUTO_CLOSURE_SCHEDULER_*`)
   - time integrity events (`SYSTEM_TIME_CHANGE_DETECTED`,
     `SYSTEM_TIMEZONE_OFFSET_CHANGED`)
   - software version reporting
   - user/establishment governance events (`ESTABLISHMENT_USER_*`,
     `USER_*`, `ESTABLISHMENT_*`)
2. Add retry helper (`appendWithRetry`) with bounded backoff attempts.
3. Add explicit fail-safe helpers:
   - `logSoftwareEventFailSafe(input)`
   - `logSoftwareEventForAllEstablishmentsFailSafe(...)`
4. Keep existing best-effort APIs, but:
   - rethrow for critical failures after logging,
   - continue swallow-only behavior for non-critical event types.

### Step 2 - Make startup lifecycle fail closed

In `app.ts` startup callback:

1. Wrap startup journaling sequence in try/catch.
2. If critical event journaling fails during startup, log and close server
   with process exit (non-zero), so startup is not considered healthy while
   compliance journaling is broken.

### Step 3 - Tests

Update runtime tests:

1. `softwareEventJournal.runtime.test.ts`
   - critical all-establishments enumeration failure now rejects.
   - add tests for retry count + fail-safe throw semantics.
   - add test for partial all-establishments failure aggregation.
2. Keep existing non-critical best-effort test (no throw) for a non-critical
   event type.

### Step 4 - Verify

1. `npm run type-check` (backend)
2. `npx vitest run src/services/legal/softwareEventJournal.runtime.test.ts src/services/legal/timeChangeMonitor.test.ts`
3. `npx vitest run` (full backend)
4. lint diagnostics on touched files

## Acceptance criteria

1. Critical software-event append failures are no longer silently swallowed.
2. Non-critical software-event append failures remain best-effort (logged).
3. Startup fails closed if critical runtime lifecycle journaling cannot be persisted.
4. Runtime tests explicitly lock this critical vs non-critical behavior.

