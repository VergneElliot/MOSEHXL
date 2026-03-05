# Fix: moment-timezone Version and Unified Timezone Strategy (Audit #33)

This doc explains **why** an invalid or mismatched `moment-timezone` version and scattered timezone literals were a problem, **what** we changed (valid version + single default + configurable closures), and **how** all time-based features stay in sync with Paris (or a configurable timezone).

---

## 1. What was the problem?

### 1.1 Invalid moment-timezone version

The backend had `moment-timezone: ^0.6.0`. At the time of the audit, **version 0.6.0 did not exist** on npm (the latest in the 0.5.x line was 0.5.48). That can lead to:

- **Install failures** or resolution to an unexpected version when 0.6.0 was later published.
- **Inconsistent behavior** across environments (CI vs local, or different npm cache states).

Even after 0.6.0 appeared on npm, staying on **0.5.x** is the stable, well-tested line. We pin to `^0.5.48` so the dependency always resolves to a known-good version.

### 1.2 Timezone scattered and hardcoded

Timezone logic was spread across the codebase with the literal `'Europe/Paris'` (or `'02:00'`) in several places:

- **app.ts** — Pool options: `options: '--timezone=Europe/Paris'`
- **closureScheduler.ts** — `settings.timezone || 'Europe/Paris'`, and when calling closure logic
- **closureOperations.ts** — Hardcoded `const timezone = 'Europe/Paris'` for business-day period
- **establishmentOperations.ts** — `'Europe/Paris'` as default when updating establishment info
- **EstablishmentDataProcessor.ts** — `data.timezone || 'Europe/Paris'`

So:

- There was **no single source of truth** for the default timezone. Changing it would require editing many files.
- The **closure scheduler** and **closure operations** could theoretically drift (e.g. if someone changed one place and not the other).
- The app is France-only for the foreseeable future; all time constraints (auto closure, business day, future agenda/scheduler features) must stay **unified and configurable** so that (1) everything uses Paris by default, and (2) any future feature (e.g. per-establishment timezone or configurable closure time) can plug into the same strategy.

---

## 2. What we changed

### 2.1 moment-timezone version

- In **MuseBar/backend/package.json**, changed `moment-timezone` from `^0.6.0` to **`^0.5.48`**.
- Ran `npm install` so the lockfile pins a valid 0.5.x release. All time calculations (closure scheduler, business-day period, etc.) continue to use `moment-timezone`; the API we use is unchanged between 0.5.x and 0.6.x for our usage.

### 2.2 Single default timezone constant

- **Added** **backend/src/config/timezone.ts** with:

  ```ts
  export const DEFAULT_APP_TIMEZONE = 'Europe/Paris';
  ```

- **Replaced** every hardcoded `'Europe/Paris'` (and the pool timezone option) with `DEFAULT_APP_TIMEZONE` in:
  - **app.ts** — Pool `options: '--timezone=${DEFAULT_APP_TIMEZONE}'`
  - **closureScheduler.ts** — `settings.timezone || DEFAULT_APP_TIMEZONE` (and when calling `createDailyClosure`)
  - **closureOperations.ts** — `createDailyClosure(..., timezone = DEFAULT_APP_TIMEZONE)` and use of that param in `getBusinessDayPeriod`
  - **establishmentOperations.ts** — Default timezone when updating establishment info
  - **EstablishmentDataProcessor.ts** — `data.timezone || DEFAULT_APP_TIMEZONE`

So there is **one place** to change the default (e.g. if you ever ship outside France); all server-side time behavior stays aligned.

### 2.3 Configurable closure timezone end-to-end

- **ClosureOperations.createDailyClosure** now takes an optional third argument: **`timezone?: string`**, defaulting to `DEFAULT_APP_TIMEZONE`.
- **ClosureScheduler** reads `timezone` from **closure_settings** (key-value table); if missing, it uses `DEFAULT_APP_TIMEZONE`. When it runs the automatic daily closure, it passes that timezone into **createDailyClosure(businessDayDate, establishmentId, timezone)**.
- **LegalJournalModel.createDailyClosure** forwards the optional timezone to **ClosureOperations**. Manual or route-triggered closures (e.g. **routes/legal/closure.ts**) do not pass a third argument, so they use the default.

So:

- **Auto closure** uses the timezone from **closure_settings** (configurable), falling back to Paris.
- **Manual closure** and other callers use the default Paris timezone unless they explicitly pass a timezone.
- **Business day period** (e.g. 02:00–01:59:59 next day) is always computed in the same timezone as the closure (Paris or whatever is configured).

All time constraints (current auto scheduler, manual closures, and any future agenda/scheduler features) can rely on:

1. **DEFAULT_APP_TIMEZONE** for the app-wide default.
2. **closure_settings** (and optionally **establishments.timezone**) for overrides.
3. **moment-timezone** with a valid 0.5.x version for DST-safe, timezone-aware calculations.

---

## 3. Where timezone is used (reference)

| Location | Role |
|----------|------|
| **config/timezone.ts** | Single constant `DEFAULT_APP_TIMEZONE = 'Europe/Paris'` |
| **app.ts** | Pool session timezone for PostgreSQL (NOW(), TIMESTAMPTZ display) |
| **closureScheduler.ts** | Reads timezone from closure_settings; passes it to createDailyClosure |
| **closureOperations.ts** | Business day period and daily closure in given timezone (default Paris) |
| **establishmentOperations.ts** | Default timezone when updating establishment info |
| **EstablishmentDataProcessor.ts** | Default timezone when creating an establishment |
| **establishments.timezone** (DB) | Per-establishment timezone; can be used by future features |
| **closure_settings** (DB) | timezone key for auto-closure (and daily_closure_time, grace period, etc.) |

Migrations and SQL that mention `'Europe/Paris'` (e.g. `AT TIME ZONE 'Europe/Paris'`) are left as-is; they encode the historical convention and are correct for the data that was stored when the session timezone was Paris.

---

## 4. Summary

| Before | After |
|--------|--------|
| moment-timezone ^0.6.0 (invalid or unstable) | moment-timezone ^0.5.48 (valid, stable) |
| 'Europe/Paris' hardcoded in many files | Single DEFAULT_APP_TIMEZONE in config/timezone.ts |
| createDailyClosure always used Paris | createDailyClosure(date, establishmentId, timezone?) with default Paris; scheduler passes settings timezone |

**Takeaway:** Use a **valid, pinned** version of `moment-timezone` (0.5.x). Keep a **single default timezone** constant and use it everywhere; make closure (and any future scheduler/agenda feature) **configurable** via closure_settings and optional parameters so all time constraints stay in sync and Paris remains the default for France-only deployment.
