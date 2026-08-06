# 445 - Planning: Staff Shifts, Recurrence & Employee Confirmation - Implementation

Date documented: 2026-08-06 (work landed 2026-07-30 → 2026-08-05)  
Foundation: `443` (Admin Space)  
Related: `446` (Time Clock uses the same `access_planning` permission for its admin side)

---

## 1) Context

Venues can now build a staff rota inside the app: create shifts on a week grid, repeat them
(daily/weekly/monthly/yearly), duplicate a whole week, and let each employee **confirm or
decline** their proposed shifts by email — no login needed for the confirmation step.
Everyone can subscribe to their personal schedule from Google/Apple/Outlook calendar via a
private ICS URL.

---

## 2) Data model

### `staff_shifts` (created in the admin-space migration)

| Column | Notes |
|---|---|
| `establishment_id` / `user_id` | Tenant + employee FKs (CASCADE) |
| `starts_at` / `ends_at` | `TIMESTAMPTZ`; CHECK `ends_at > starts_at` |
| `label` / `note` | Free text |
| `created_by`, timestamps | |

### Recurrence & approval (migration `2026_08_05_19_30_00_staff_shift_recurrence_approval.sql`)

| Column | Values |
|---|---|
| `series_id` (`UUID`) | Groups occurrences of one recurring series |
| `recurrence` | `once` \| `daily` \| `weekly` \| `monthly` \| `yearly` (DB CHECK) |
| `approval_status` | `pending_employee` \| `confirmed` \| `declined` \| `pending_admin` (CHECK; `pending_admin` reserved, never assigned yet) |
| `confirmation_token` (`UUID`) | One token **shared by the whole series** — one click confirms everything |

Recurrence is **not** an RRULE engine: `StaffShiftModel.createSeries` materializes a fixed
number of concrete rows up front — 30 daily, 26 weekly, 12 monthly, or 5 yearly occurrences,
each keeping the original duration. Simple, predictable, and every occurrence is a normal
row that can be edited or deleted individually.

### `staff_planning_ics_tokens`

One row per employee (`user_id` PK): a `UUID` token backing the public calendar feed URL.

---

## 3) Workflow — proposal, then confirmation

1. Admin creates a shift (or series) → rows are inserted with
   `approval_status = 'pending_employee'` and a fresh shared `confirmation_token`
   (employee confirmation is currently always required on create).
2. The employee gets one email — template `shift_confirmation_employee`
   (`services/email/templates/shiftTemplates.ts`, subject
   *"Confirmez votre planning — {venue}"*) with **Confirmer** / **Refuser** links to
   `/planning/confirm/{token}?action=confirm|decline`.
3. `PublicShiftConfirmPage` (no login) shows the proposal summary and submits the choice;
   the backend flips **all** still-pending rows of that token to `confirmed` or `declined`.
4. Declined shifts disappear from default listings; `duplicateWeek` copies only confirmed
   shifts (as plain `once`/`confirmed` rows, no new token).

---

## 4) API

### Admin — `/api/admin/planning` (gate: `access_planning` or establishment admin)

| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/planning/staff` | Establishment members (for the picker) |
| GET | `/api/admin/planning/shifts?from&to&user_id?` | Shifts overlapping the window |
| POST | `/api/admin/planning/shifts` | Create shift/series (`recurrence` field) + confirmation email |
| PATCH | `/api/admin/planning/shifts/:id` | Edit one occurrence (times/employee/label) |
| DELETE | `/api/admin/planning/shifts/:id` | Delete one occurrence |
| POST | `/api/admin/planning/shifts/duplicate-week` | Copy confirmed shifts from one week to another |
| GET | `/api/admin/planning/ics/token/:userId` | Get/create the employee's calendar token + URL |

### Public — no auth (`routes/public/planning.ts`, `routes/public/icsFeeds.ts`)

| Method | Path | Description |
|---|---|---|
| GET / POST | `/api/public/planning/confirm/:token` | Read proposal / submit `{ action: 'confirm' \| 'decline' }` |
| GET | `/api/public/ics/planning/:token.ics` | Personal schedule feed (−1 month → +3 months) |

---

## 5) Frontend — `PlanningPanel.tsx`

- **Month calendar** (shared `AdminMonthCalendar`): pending shifts shown orange
  ("en attente"), confirmed blue.
- **Week grid** — employees × days; click a cell to create, × to delete.
- **Create dialog** with a *Fréquence* selector (once/daily/weekly/monthly/yearly) —
  recurrence is set at creation only, edits apply to single occurrences.
- **Dupliquer la semaine →**, print view, and a per-employee **Copier ICS** button.

The confirmation state is display-only for admins — there are no admin override buttons
yet (`pending_admin` exists in the schema for that future flow).

---

## 6) Rollback

Additive. Roll back `2026_08_05_19_30…` (and the foundation migration for the base table),
revert the commit. Declined/pending information lives only in the new columns.
