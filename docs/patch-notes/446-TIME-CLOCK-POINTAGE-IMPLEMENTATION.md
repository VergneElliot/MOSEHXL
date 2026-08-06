# 446 - Time Clock (Pointage): IP-Restricted Clock In/Out - Implementation

Date documented: 2026-08-06 (work landed 2026-08-05)  
Foundation: `443` (Admin Space), `445` (shares the `access_planning` gate for admin reports)

---

## 1) Context

Employees can now clock in and out of work ("pointage") — either from their own session via
a button in the app header, or from a shared terminal at the venue where each employee
punches with their password. The key integrity rule: **punching only works from the venue's
network**. Every venue defines an allowlist of IP addresses/ranges, and clock actions from
anywhere else are refused. That prevents "clocking in from the couch".

---

## 2) Data model — migration `2026_08_05_12_00_00_time_entries.sql`

### `time_entries`

| Column | Notes |
|---|---|
| `establishment_id` / `user_id` | Tenant + employee |
| `clock_in_at` | Defaults to now |
| `clock_out_at` | `NULL` = currently on shift; CHECK `> clock_in_at` |
| `clock_in_ip` / `clock_out_ip` | Audit: where each punch came from |
| `source` | `self` (own session) \| `shared_terminal` (venue tablet) \| `admin` (correction) |
| `note`, `adjusted_by` | Correction trail — any admin edit records who adjusted and forces `source = 'admin'` |

Integrity: a **partial unique index** (`idx_time_entries_one_open_per_user` on `(user_id)
WHERE clock_out_at IS NULL`) guarantees at most one open entry per user across the whole
platform — you cannot be "on shift" twice. RLS tenant policies as usual.

### Network allowlist

Stored in `establishment_settings` under key **`time_clock_allowed_ips`** as
`{"allowed_ips": ["203.0.113.10", "203.0.113.0/24", …]}`. Accepted values: bare IPv4/IPv6
addresses or IPv4 CIDR ranges (`/0`–`/32`). The check strips the IPv6-mapped `::ffff:`
prefix so proxied IPv4 clients match. **An empty allowlist blocks punching entirely**
(403 `TIME_CLOCK_NETWORK_NOT_CONFIGURED`) rather than allowing everything — fail closed.

Unit tests in `models/timeEntry.ip.test.ts` cover: IP/CIDR validation (rejects `/33` and
garbage), exact matching, `::ffff:` stripping, CIDR range membership, the empty-allowlist
refusal, and allowlist normalization (trim/dedupe/drop invalid).

---

## 3) API — `/api/admin/time-clock`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/status` | any authenticated user | Own open entry + `on_venue_network`, `client_ip`, `allowed_ips_configured` |
| POST | `/clock-in` / `/clock-out` | auth + venue IP | Self punch (`source: 'self'`) |
| GET | `/staff` | auth | Staff list + each person's open entry (shared-terminal screen) |
| POST | `/punch` | auth + venue IP + **target user's password** | Shared-terminal toggle for `user_id` (`source: 'shared_terminal'`) |
| GET | `/entries?from&to&user_id?` | admin or `access_planning` | Entries + worked-hour totals |
| PATCH / DELETE | `/entries/:id` | admin or `access_planning` | Admin correction / delete |
| GET / PUT | `/network` | establishment admin only | Read / set the allowlist; PUT supports `capture_current: true` to append the caller's IP |

---

## 4) Frontend

| Component | Role |
|---|---|
| `TimeClockHeaderControl.tsx` | Header button for every venue-bound user (hidden for system admins). Polls `/status` every 60 s; shows *Entrée* / *Sortie*, an "En service HhMm" chip, and disables itself with a "Hors réseau" hint when off the venue network |
| `TimeClockPanel.tsx` | Administration → Pointage. Shared-terminal mode: staff cards + password punch dialog, "En service maintenant" chips. Admins (or `access_planning`) additionally get a date-range **Heures travaillées** report with per-entry corrections |
| `TimeClockNetworkSettings.tsx` | Settings tab **Pointage** (`time_clock_network`): manage the allowlist, one-click "Ajouter l'IP actuelle" |

---

## 5) Design notes

- The password check on `/punch` means a shared tablet can stay logged in under any account
  while each employee authenticates their own punch — no session juggling.
- IPs are recorded on both ends of every entry, so disputes can be audited.
- Worked-hour totals are computed server-side from the entries in the requested window.

---

## 6) Rollback

Additive. Roll back `2026_08_05_12_00_00_time_entries.sql`, revert the commit, and delete
the `time_clock_allowed_ips` settings rows if desired.
