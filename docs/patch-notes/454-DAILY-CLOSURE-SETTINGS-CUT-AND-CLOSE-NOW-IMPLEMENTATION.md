# 454 - Daily Closure Periods: Settings Cut Time + Close-Now Mode - Implementation

Date: 2026-08-13  
Prior: hardcoded `02:00` in `createDailyClosure` / business-day-stats

---

## 1) Problem

Auto-closure scheduler already respected `daily_closure_time` from settings, but **manual
(and auto) bulletin aggregation** always used `'02:00'`. Changing settings to 04:00 for a
late night did not change which sales entered the daily bulletin.

---

## 2) Rules

Single cut time from closure settings (`daily_closure_time` + `timezone`):

| Mode | Period |
|------|--------|
| **`business_day`** (default, date picker) | Cut on day D → cut on D+1, clamped after last closed DAILY `period_end` |
| **`close_now`** | Last closed DAILY `period_end` + 1ms → now (or current business-day start if none) |

Invariant: continuous coverage, no overlaps. Empty / already-covered windows throw a clear error.

Auto-closure keeps using `business_day` for the completed calendar business day (now with the
real cut time).

---

## 3) API

`POST /legal/closure/create` and `POST /legal/closure/daily` accept optional:

```json
{ "mode": "close_now" | "business_day" }
```

Default remains `business_day`. `close_now` may omit a meaningful date (server uses `now`).

---

## 4) UI

Create closure dialog (DAILY):

- Radio **Clôturer maintenant** (default)
- Radio **Clôturer une journée commerciale** + date
- Helper text shows the configured cut time from settings

---

## 5) Also fixed

`GET /legal/business-day-stats` reads cut time + timezone from closure settings (History live CA
matches the same business day as bulletins).

---

## 6) Files

- `businessDayPeriod.ts` — `resolveDailyClosurePeriod`
- `closureOperations.ts` / `journalRead.ts` — settings + last closed `period_end`
- `routes/legal/closure.ts`, `businessDayStats.ts`
- `CreateClosureDialog.tsx`, `useClosureAPI.ts`
- `businessDayPeriod.test.ts`
