# 463 — Close remaining floor/closure backlog (pragmatic) — Implementation

Date: 2026-08-27  
Plan: `docs/patch-notes/462-FLOOR-CLOSURE-PRAGMATIC-BACKLOG-CLOSE-PLAN.md`  
Branch: `development`

---

## 1) Shipped

### Closure
- Regenerated `LATEST-INDEX.md` (includes 461+).
- `GET /api/legal/closure/suggest-business-day-date` — prefills business_day date from first uncovered sale, else previous completed business day.
- Create-closure dialog loads that suggestion on open / when switching to business_day.
- Scheduler skips empty-day / future-window refusals like “already exists”.
- Settings: warning when enabling auto-closure + manual trigger reminder.
- Tests: date keys, grace window, empty-day skip.

### Admin PIN
- User Management: PIN status chip, set/change (6 digits), clear — uses existing `/auth/pin/*`.

### Floor
- POS map: plan tabs when multiple active plans; tables for selected plan only.
- Admin « Plans de tables »: list/create/rename/activate plans; table CRUD (label, capacity, sort).
- `manage_floor_plan` added to `ALL_PERMISSIONS` UI list.

### Waiter day report
- `GET /api/orders/waiter-day-report?date=` — cut→cut, group by waiter snapshot.
- History panel « CA par serveur » (non-fiscal).

---

## 2) Parked (Phase D+)

- Drag-canvas floor editor  
- Multi-station websockets  
- Full PIN-authorize migration (cancel / menu / …)  
- Seasonal-worker one-click template  

---

## 3) Auto-closure re-enable checklist (production)

Do **not** flip auto on without this:

1. Deploy this commit; confirm backend stays up across several 5‑minute scheduler ticks.  
2. Settings → keep auto **off**; confirm cut time editable.  
3. Enable auto → Save → « Déclencher vérification manuelle » outside service.  
4. Confirm no pm2 crash loop; audit rows use null IP (not `system`).  
5. Only then leave auto enabled overnight.

Production auto remains **off** until you run this checklist.

---

## 4) How to try

1. Clôture → Créer → Journée commerciale → date should suggest the open day.  
2. Admin → Utilisateurs → Définir PIN.  
3. Admin → Plans de tables → create plan/tables; POS map switches plans.  
4. Historique → CA par serveur for a date with waiter snapshots.
