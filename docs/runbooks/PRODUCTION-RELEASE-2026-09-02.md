# Production release — September 2026 (development → main)

Scope: floor service, PIN sessions, admin space extensions, staff labor (pointage / congés / synthèse paie), operating hours split, reservations runbook.

**Target:** `mosehxl.com` (`/var/www/MOSEHXL`, PM2 `mosehxl-backend`).

---

## 0) Preconditions

1. Merge `development` → `main` via PR (CI green on PR).
2. **Production DB backup** before any migration (DigitalOcean managed Postgres `mosehxl_production`).
3. Maintenance window ~15–30 min if many migrations pending (see §2).
4. Confirm SendGrid + Spaces env vars still set (`docs/runbooks/DEPLOY-PRINT-AND-EMAIL.md`).

---

## 1) Discover current production migration state

On a machine with production `DB_*` credentials (or SSH to app server):

```bash
cd /var/www/MOSEHXL/MuseBar/backend
npm run migration:status
```

Note the **Pending** count. As of local dev (2026-09-02), the chain has **60** migrations. Production evidence from July 2026 showed **44** applied — expect **~16 pending**, but always trust `migration:status` on prod.

---

## 2) Pending migrations (if prod is at 44 / `2026_07_01_14_00_00`)

These run **in order** via `npm run migration:migrate` (includes backfills):

| # | Migration | Type | Notes |
|---|-----------|------|-------|
| 45 | `2026_07_30_15_00_00_establishment_admin_space.sql` | schema + **backfill** | Admin permissions (`access_documents`, `access_inbox`, …) granted to establishment admins |
| 46 | `2026_07_30_16_00_00_user_establishment_memberships.sql` | schema + **backfill** | Memberships table; venue-scoped permissions; duplicate-email merge |
| 47 | `2026_07_30_18_00_00_reservation_status_and_opening_hours.sql` | schema | Reservation workflow + `opening_hours` settings key |
| 48 | `2026_07_30_20_00_00_guest_no_show_flags.sql` | schema | No-show flags |
| 49 | `2026_08_05_12_00_00_time_entries.sql` | schema | Pointage / time clock |
| 50 | `2026_08_05_18_30_00_inbox_message_id_text.sql` | schema | Inbox message id type |
| 51 | `2026_08_05_19_30_00_staff_shift_recurrence_approval.sql` | schema | Planning recurrence + approval |
| 52 | `2026_08_13_22_00_00_floor_service_and_membership_pin.sql` | schema + **backfill** | Floor service tables, PIN columns, `access_pos` floor permissions |
| 53 | `2026_08_13_23_30_00_order_waiter_table_snapshot.sql` | schema | Waiter/table snapshot on orders |
| 54 | `2026_08_15_20_00_00_closure_bulletin_annulment.sql` | schema | Closure annulment |
| 55 | `2026_08_27_15_00_00_backfill_manage_floor_plan_for_est_admins.sql` | **backfill** | `manage_floor_plan` for all active establishment admins |
| 56 | `2026_08_27_16_00_00_dining_table_label_unique_per_establishment.sql` | schema | Unique table labels per venue |
| 57 | `2026_08_28_14_00_00_open_ticket_item_line_status.sql` | schema | Kitchen line status |
| 58 | `2026_08_28_16_00_00_pos_reassign_waiter_permission.sql` | catalog | `pos_reassign_waiter` permission |
| 59 | `2026_08_28_17_00_00_pos_intervene_table_permission.sql` | catalog | `pos_intervene_table` permission |
| 60 | `2026_09_02_16_00_00_staff_leave_and_labor_settings.sql` | schema | Congés (`staff_leave_*`) — **required for Pointage synthèse paie** |

**No separate manual backfill scripts** — all data backfills are inside the migration UP sections. Running `migration:migrate` once applies everything idempotently.

**Heavy migration:** `2026_07_30_16_00_00` merges duplicate emails and re-scopes permissions. Run during low traffic; backup first.

---

## 3) Release order (recommended)

### Step A — Backup (mandatory)

```bash
# From ops machine with pg_dump access to DO Postgres
pg_dump -h "$DB_HOST" -U "$DB_BACKUP_USER" -d mosehxl_production -Fc \
  -f "mosehxl-backup-$(date +%Y%m%d-%H%M).dump"
```

### Step B — Pull code on server

```bash
cd /var/www/MOSEHXL
git fetch origin
git checkout main
git pull origin main
```

### Step C — Migrations **before** restart (critical)

```bash
cd /var/www/MOSEHXL/MuseBar/backend
npm ci --workspaces=false --include-workspace-root=false
npm run migration:status    # expect N pending
npm run migration:migrate   # applies all pending; checksum-verified
npm run migration:status    # expect Pending: 0
```

If migrate fails: **do not restart the app**. Restore from backup or fix forward; never edit applied migration files.

### Step D — Build & restart

```bash
cd /var/www/MOSEHXL
npm ci
npm run build --workspace MuseBar
cd MuseBar/backend && npm run build

pm2 restart musebar-backend --update-env
pm2 save
```

Reload nginx if static frontend path changed (usually automatic after `MuseBar/build` copy if your deploy script does that).

### Step E — Smoke tests

| Check | Command / action |
|-------|------------------|
| API health | `curl -s https://mosehxl.com/api/health` |
| Login | Web login as establishment admin |
| POS | Open Caisse, PIN session |
| Admin → Pointage | Synthèse paie tab loads (no 500 / missing table) |
| Admin → Planning | Congés dialog shows day preview |
| Paramètres | **Horaires d'ouverture** tab separate from **Plages de réservations** |
| Réservations | Public page still books within reservation plages |

Reservation email verification: `docs/runbooks/RESERVATIONS-PRODUCTION-VERIFY.md`.

---

## 4) Post-deploy configuration (per establishment)

1. **Paramètres → Horaires d'ouverture** — set real service days (CP décompte); especially if open Sunday but no Sunday reservations.
2. **Paramètres → Plages de réservations** — keep as online booking windows only.
3. **Administration → Réservations** — confirm SendGrid inbound if using inbox.
4. **Congés entitlements** — accountant may need initial CP/RTT balances per employee (Administration → Planning).

---

## 5) Rollback

- **App only:** `git checkout <previous-main-sha>`, rebuild, `pm2 restart`.
- **DB:** restore `pg_dump` backup (migrations are forward-only; down migrations are for dev emergencies only).

---

## 6) CI note

GitHub Actions builds artifacts on `main` push but **does not auto-deploy** to DO. Server pull + migrate + build is manual (this runbook).
