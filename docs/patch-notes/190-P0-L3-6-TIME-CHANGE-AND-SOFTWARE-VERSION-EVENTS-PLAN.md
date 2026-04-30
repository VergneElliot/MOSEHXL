# 190 - P0-L3.6 (Time-Change + Software-Version Events) - Plan

Date: 2026-04-30  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (L3 continuation)

## Why this pass exists

L3 required software-event coverage for:

- boot / shutdown,
- time change,
- software update,
- configuration changes.

Earlier L3 passes already covered:

- boot/shutdown + scheduler lifecycle,
- key configuration mutations (printing, happy-hour),
- establishment/user lifecycle and state transitions.

The remaining gap is explicit runtime detection for:

1. system time jumps / drifts, and
2. software version visibility as a journaled event.

## Scope

### In scope

1. Extend software-event type catalog with:
   - `SYSTEM_TIME_CHANGE_DETECTED`
   - `SYSTEM_TIMEZONE_OFFSET_CHANGED`
   - `SOFTWARE_VERSION_REPORTED`
2. Add a legal time-change monitor service that:
   - tracks wall-clock deltas between checks,
   - detects abnormal jumps,
   - detects timezone offset changes for app timezone.
3. Wire monitor lifecycle in app start/shutdown.
4. Emit a startup version software event fan-out.
5. Add focused regression tests.
6. Write implementation notes.

### Out of scope

- Perfect source-of-truth update detection against deployment tooling history.
- NTP-level diagnostics.

## Design choices

1. **Best-effort journaling only**
   - Time/version event append failure must not crash app runtime.

2. **Runtime monitor is lightweight and deterministic**
   - Uses simple periodic checks with configurable thresholds.
   - Detects practical "clock changed" signals without overengineering.

3. **Version as explicit software event**
   - Every process boot reports app version in the legal software-event stream.
   - This gives a verifiable deployment breadcrumb even without full CD integration.

## Strategy

### Step 1 - Event type extension

File:
- `MuseBar/backend/src/services/legal/softwareEventJournal.ts`

Add new event literals for time/version visibility.

### Step 2 - Time monitor service

Files:
- `MuseBar/backend/src/services/legal/timeChangeMonitor.ts` (new)

Responsibilities:
- maintain last observed wall clock + last timezone offset,
- detect and journal:
  - `SYSTEM_TIME_CHANGE_DETECTED`,
  - `SYSTEM_TIMEZONE_OFFSET_CHANGED`.

### Step 3 - App wiring

File:
- `MuseBar/backend/src/app.ts`

Changes:
- start monitor when server boots,
- stop monitor during graceful shutdown,
- emit `SOFTWARE_VERSION_REPORTED` on boot.

### Step 4 - Regression tests

File:
- `MuseBar/backend/src/services/legal/timeChangeMonitor.test.ts` (new)

Cover:
- no false event under normal interval progression,
- event on large clock jump,
- event on timezone offset change.

### Step 5 - Verify

Run:
- targeted tests for monitor/runtime event helpers,
- backend type-check,
- lint diagnostics on touched files.

## Acceptance criteria

1. Clock jumps and timezone offset transitions emit software events.
2. Startup emits explicit software-version event.
3. Tests prove expected detection behavior.
4. Plan + implementation patch notes are present.
