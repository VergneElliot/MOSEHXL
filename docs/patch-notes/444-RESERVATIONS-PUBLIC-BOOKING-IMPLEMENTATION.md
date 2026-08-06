# 444 - Reservations: Public Booking, Opening Hours & No-Show Flags - Implementation

Date documented: 2026-08-06 (work landed 2026-07-30 → 2026-08-05)  
Foundation: `443` (Admin Space, slugs, inbox)  
Runbook: `docs/runbooks/ADMIN-SPACE-INBOUND-AND-STORAGE.md` §4–5

---

## 1) Context

Guests can now book a table **online, without an account**, through a public page unique to
each venue (`/reserve/<slug>`). Staff manage the requests from the new
**Administration → Réservations** panel. The system also remembers guests who didn't show
up (platform-wide), and venues define when they are open for bookings.

Design choice worth understanding: a public booking is only a **request**. Nothing is
auto-confirmed — staff explicitly confirm, hold, or refuse each request, and the guest is
emailed at each step. This keeps humans in control of the room.

---

## 2) Data model

### `reservations` (created in the admin-space migration, extended by `2026_07_30_18_00_00_reservation_status_and_opening_hours.sql`)

| Column | Notes |
|---|---|
| `establishment_id` | Tenant FK, RLS-scoped |
| `customer_name` / `customer_email` / `customer_phone` | Name required; public bookings require email + phone |
| `party_size` | 1–200 (DB CHECK) |
| `starts_at` / `ends_at` | `TIMESTAMPTZ`; `ends_at` optional (ICS defaults to 90 min) |
| `status` | See lifecycle below; default `requested` |
| `status_reason` | Optional commentaire shown to the guest (hold/refusal motive, cancel note) |
| `source` | `manual` (staff) or `public` (online form) |
| `inbox_message_id` | Each public action also drops a message into the venue inbox |
| `created_by`, `notes`, timestamps | |

### Status lifecycle

Seven statuses (DB CHECK `reservations_status_check`):

```
requested → confirmed | on_hold | refused        (staff decision)
on_hold   → confirmed | refused                  (staff decision)
confirmed/on_hold → cancelled                    (guest, ≥ 48 h before start)
any       → no_show | seated | cancelled …       (staff, free-form edit)
```

There is intentionally **no server-side state machine** — staff can correct any status via
PATCH. The guarded paths are the guest-facing ones (cancel only from confirmed/on_hold and
only ≥ 48 h ahead).

### Opening hours — stored as settings, not a table

Key `opening_hours` in `establishment_settings`, JSON shape:

```json
{ "timezone": "Europe/Paris",
  "weekly": { "mon": { "closed": false, "open": "11:00", "close": "23:00" }, ... } }
```

Model `openingHoursSettings.ts` validates a requested slot in the **venue's timezone**
(via `Intl`), supports overnight windows (close ≤ open means "past midnight"), and treats
the close time as exclusive. Defaults: Mon–Sat 11:00–23:00, Sunday closed. Individual days
can be closed without touching weekly hours via key `reservation_closed_dates`
(`{ "dates": ["YYYY-MM-DD", …] }`, model `reservationClosedDates.ts`).

### `guest_no_show_flags` (migration `2026_07_30_20_00_00_guest_no_show_flags.sql`)

A **platform-wide** (cross-establishment, deliberately not RLS-scoped per venue) memory of
no-shows: normalized email and/or phone (`contact_type` + `contact_value`, unique pair),
`flag_count` incremented on repeat offences, first/last flagged timestamps. A guest gets
flagged when staff set a reservation to `no_show`. Flags **never block** a booking — they
surface as a warning: the admin list shows a `No-show (N×)` chip and the inbox alert
includes `⚠ ALERTE NO-SHOW`. Phone normalization handles French formats (`+33`/`0033` → `0…`).

---

## 3) API

### Admin — `/api/admin/reservations` (gate: `access_reservations` or establishment admin)

| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/reservations?from&to&status` | List, each row enriched with `guest_reliability` |
| POST | `/api/admin/reservations` | Manual create (emails guest if email given) |
| PATCH | `/api/admin/reservations/:id` | Edit / change status (status-change emails; `no_show` flags the guest) |
| DELETE | `/api/admin/reservations/:id` | Hard delete |
| GET | `/api/admin/reservations/public-link` | The venue's public booking URL `{FRONTEND_URL}/reserve/{slug}` |
| GET / PUT | `/api/admin/reservations/closed-dates[/:date]` | List / toggle closed calendar days |
| GET / POST | `/api/admin/reservations/ics/token` · `/ics/rotate` | Calendar feed token (rotate invalidates old URL) |

### Settings — opening hours (gate: `access_settings`)

`GET` / `PUT` `/api/settings/opening-hours` — the PUT also journals a new software event
`OPENING_HOURS_UPDATED`.

### Public — no login, rate-limited (`routes/public/reservations.ts`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/public/reservations/:slug` | Venue name, opening hours, closed dates, timezone |
| POST | `/api/public/reservations/:slug` | Create booking (`requested`/`public`); honeypot field `website` silently fakes success for bots |
| POST | `/api/public/reservations/:slug/remind` | Guest nudges the venue about a still-`requested` booking (1 h in-memory cooldown) |
| POST | `/api/public/reservations/:slug/cancel` | Guest cancels (token + ≥ 48 h rule) |
| GET | `/api/public/ics/reservations/:token.ics` | Calendar feed (−1 month → +6 months, excludes cancelled) |

### Guest action tokens (`reservationRemindToken.ts`)

Links in guest emails carry an HMAC-SHA256 token (`{action}.{reservationId}.{sig}`, first
20 hex chars of the signature, timing-safe compare). Secret:
`RESERVATION_REMIND_SECRET` → `JWT_SECRET` → `SESSION_SECRET` fallback chain. Tokens don't
expire on their own — safety comes from the status + 48 h checks on the server.

---

## 4) Emails

All reservation mail is sent **From `{Venue Name} <slug@mosehxl.com>`** with Reply-To the
same address, so guest replies land in the venue's in-app inbox. New built-in templates
(`services/email/templates/reservationTemplates.ts`):

| Template id | Sent when | To |
|---|---|---|
| `reservation_requested_guest` | Booking received | Guest (includes "relancer" link) |
| `reservation_requested_venue` | Booking received | Venue contact email |
| `reservation_confirmed` / `reservation_on_hold` / `reservation_refused` | Staff decision | Guest (confirmed/on_hold include cancel link + commentaire) |
| `reservation_reminder_venue` | Guest clicked "relancer" | Venue |
| `reservation_cancelled_guest` / `reservation_cancelled_venue` | Guest cancelled online | Both |

---

## 5) Frontend

### Public pages (registered in `App.tsx`, no auth)

| Route | Page |
|---|---|
| `/reserve/:slug` | `PublicReservationPage` — month calendar (closed days disabled), 30-minute slot picker, guest details form, honeypot |
| `/reserve/:slug/relancer/:token` | `PublicReservationRemindPage` — one-click nudge |
| `/reserve/:slug/annuler/:token` | `PublicReservationCancelPage` — explains the 48 h rule, confirms cancellation |

### Admin panel (`ReservationsPanel.tsx`)

Month calendar (status-colored) + upcoming-reservations table; create/edit dialog with all
seven statuses and optional commentaire; quick actions on `requested` (Confirmer / En
attente / Refuser) and `on_hold` (Confirmer / Refuser); close/reopen a day from the
calendar; public-link copy button; ICS feed URL; a warning banner when opening hours were
never configured (Settings → **Plages de réservations**, new `OpeningHoursSettings.tsx`
settings tab with per-day open/close times and timezone).

---

## 6) Known limitations (as implemented)

- The public page builds its slot grid with the **browser's** local dates; the server
  re-validates against the venue timezone, so bad slots are rejected — but near-midnight or
  cross-timezone guests may see slots that then fail validation.
- The remind cooldown is in-memory (resets on server restart).
- `requiresReason()` marks hold/refusal/confirmation as "reason expected" but routes don't
  enforce a non-empty commentaire; the UI treats it as optional with a warning.
- No guest email is sent for `no_show`, `seated`, or a staff-driven `cancelled`.

---

## 7) Rollback

Additive feature. Roll back migrations `2026_07_30_18…` and `2026_07_30_20…` (and the
foundation migration if removing the whole space), revert the commit. Public URLs simply
404 afterwards.
