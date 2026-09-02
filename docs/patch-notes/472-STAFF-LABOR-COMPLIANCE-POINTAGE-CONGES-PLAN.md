# 472 — Staff labor compliance, congés, and pointage UI (PLAN)

Date: 2026-09-02  
Foundation: `445` (planning), `446` (pointage), admin space `443`–`449`

---

## Context

Before production deploy on DigitalOcean, Administration must support:

1. **Reservations email** — verified via runbook (SendGrid + per-establishment slug/email).
2. **Pointage** — usable terminal + manager reports; current UI is functional but not polished.
3. **French labor compliance** — time limits, rest periods, break rules, planned-vs-actual reconciliation.
4. **Congés** — leave requests with approval workflow, calendar visibility, shift blocking.

No congés or labor-law logic exists in code today (`446`/`445` are baseline only).

---

## Legal scope (French Code du travail — CHR defaults)

Configurable per establishment via `establishment_settings.labor_compliance_settings`. Defaults reflect common hospitality rules:

| Rule | Default | Code reference | Enforcement |
|------|---------|----------------|-------------|
| Max daily work | 10 h (warn), 12 h (block shift create) | L3121-18 | Alert + optional hard block |
| Max weekly work | 48 h (rolling 7 days) | L3121-20 | Alert |
| Min rest between shifts | 11 h | L3132-2 | Alert on punch + shift create |
| Break after 6 h continuous | 20 min | L3121-16 | Alert on closed entries |
| Weekly rest | 35 h consecutive (info) | L3132-1 | Info only (manual planning) |

**Congés payés:** track entitlements per user/year; deduct approved `paid_leave` and `rtt` days. Sick/unpaid/family do not deduct CP balance.

> This software assists compliance; it is not legal advice. Establishments may override thresholds via settings when a valid accord exists.

---

## Data model — migration `2026_09_02_16_00_00_staff_leave_and_labor_settings.sql`

### `staff_leave_requests`

| Column | Notes |
|--------|-------|
| `leave_type` | `paid_leave`, `rtt`, `sick_leave`, `unpaid_leave`, `family_event`, `other` |
| `starts_on` / `ends_on` | Inclusive dates |
| `half_day_start` / `half_day_end` | 0.5 day each |
| `status` | `pending`, `approved`, `rejected`, `cancelled` |
| `requested_by`, `reviewed_by`, `review_note` | Audit trail |

RLS tenant policies (same pattern as `staff_shifts`).

### `staff_leave_entitlements`

Per `(establishment_id, user_id, year)`: `paid_leave_days` (default 25), `rtt_days` (default 0).

Used balance computed from approved leaves in that calendar year.

---

## Backend services

### `services/labor/laborCompliance.ts`

Pure functions + DB-backed analyzer:

- `analyzePeriod({ entries, shifts, leaves, settings })` → violations[]
- `countLeaveDays(leave)` → decimal days
- `isOnApprovedLeave(date, leaves)`
- `reconcilePlannedVsActual(shifts, entries)` → gaps per user/day

### `models/staffLeave.ts`

CRUD, approve/reject, list by range, entitlement upsert, balance summary.

### Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/POST | `/api/admin/leaves` | planning admin | List / create request |
| PATCH | `/api/admin/leaves/:id` | planning admin | Approve / reject / cancel |
| GET | `/api/admin/leaves/balances?year=` | planning admin | Entitlements + used/remaining |
| PUT | `/api/admin/leaves/balances/:userId` | est. admin | Set annual entitlement |
| GET | `/api/admin/time-clock/compliance?from&to` | planning admin | Violations + reconciliation |
| GET | `/api/admin/time-clock/export?from&to` | planning admin | CSV payroll export |

**Integration hooks:**

- `POST /planning/shifts` — reject if employee on approved leave (409).
- `POST /time-clock/clock-in` and `/punch` — warn in response if on leave; block if `block_punch_on_leave` setting true.

---

## Frontend

### `TimeClockPanel.tsx` — three tabs

1. **Terminal** — staff grid, en-service chips, punch dialog, network hint.
2. **Rapport** — period filter, totals, detail table, CSV download.
3. **Conformité** — violations list, planned vs actual summary.

### `PlanningPanel.tsx`

- Calendar shows approved congés (green) alongside shifts.
- **Congés** toolbar: request dialog, pending queue, approve/reject.
- Balance chip per employee when creating CP/RTT request.

---

## Verification

- Unit tests: `laborCompliance.test.ts`, `staffLeave` date overlap.
- Manual: create leave → shift blocked; punch during leave → warning; export CSV opens in Excel.
- Production email: `docs/runbooks/RESERVATIONS-PRODUCTION-VERIFY.md`.

---

## Slices

| # | Patch note | Scope |
|---|------------|-------|
| 473 | IMPLEMENTATION slice A | Migration, models, labor service, leave + compliance routes |
| 474 | IMPLEMENTATION slice B | TimeClockPanel tabs, PlanningPanel congés, integration tests |

CHANGELOG: **MINOR** — new staff HR capabilities, no fiscal journal impact.
