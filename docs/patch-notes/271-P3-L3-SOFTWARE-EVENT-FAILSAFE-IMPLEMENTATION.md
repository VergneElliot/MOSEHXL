# 271 - P3-L3 (Software-event journaling fail-safe for critical events) - Implementation

Date: 2026-05-20  
Related plan: `docs/patch-notes/270-P3-L3-SOFTWARE-EVENT-FAILSAFE-PLAN.md`

## What changed

### 1) Critical software-event journaling now has fail-safe semantics

Updated:

- `MuseBar/backend/src/services/legal/softwareEventJournal.ts`

Key additions:

1. `CRITICAL_SOFTWARE_EVENTS` classification for:
   - runtime lifecycle (`SERVER_STARTED`, `SERVER_SHUTDOWN`)
   - scheduler lifecycle (`AUTO_CLOSURE_SCHEDULER_STARTED`, `AUTO_CLOSURE_SCHEDULER_START_FAILED`)
   - time-integrity events (`SYSTEM_TIME_CHANGE_DETECTED`, `SYSTEM_TIMEZONE_OFFSET_CHANGED`)
   - version reporting (`SOFTWARE_VERSION_REPORTED`)
   - user/establishment governance events (`ESTABLISHMENT_USER_*`, `USER_*`, `ESTABLISHMENT_*`)
2. Bounded retry helper (`appendWithRetry`) with short backoff attempts.
3. New fail-safe APIs:
   - `logSoftwareEventFailSafe(input)`
   - `logSoftwareEventForAllEstablishmentsFailSafe(...)`
4. Existing best-effort APIs kept, but behavior tightened:
   - non-critical events remain swallow-on-failure after logging,
   - critical events now rethrow after logging (no silent loss).

### 2) Startup lifecycle now fails closed on critical journaling failure

Updated:

- `MuseBar/backend/src/app.ts`

Startup callback now wraps critical runtime journaling in try/catch:

1. `SERVER_STARTED` event append
2. `SOFTWARE_VERSION_REPORTED` append

If either fails for a critical reason, the server logs the failure and closes
with non-zero exit (`process.exit(1)`), preventing a “healthy” runtime state
without required critical software-event journaling.

### 3) Runtime tests updated for critical/non-critical split

Updated:

- `MuseBar/backend/src/services/legal/softwareEventJournal.runtime.test.ts`

Changes:

1. Critical all-establishments enumeration failure now asserts **rejects**.
2. Added fail-safe retry/throw test (`logSoftwareEventFailSafe` retries 3x).
3. Added fail-safe aggregate failure test for all-establishments mode.
4. Retained non-critical best-effort no-throw behavior test.

No behavior change was required in:

- `timeChangeMonitor.test.ts` (existing expectations still pass under mocked success path).

## Verification

Executed:

1. `npm run type-check` (backend) -> pass
2. `npx vitest run src/services/legal/softwareEventJournal.runtime.test.ts src/services/legal/timeChangeMonitor.test.ts` -> pass
3. `npx vitest run` (full backend) -> pass (`44/44`, `176/176`)
4. lint diagnostics on touched files -> no issues

## Result

P3-L3 objective is satisfied:

- critical software-event failures are no longer silently swallowed,
- startup lifecycle now fails closed if critical journaling is unavailable,
- non-critical software events remain best-effort to avoid unnecessary
  operational disruption.

