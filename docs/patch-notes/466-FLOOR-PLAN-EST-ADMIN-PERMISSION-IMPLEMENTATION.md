# 466 — Floor plan permission for establishment admins — Implementation

Date: 2026-08-27  
Branch: `development`  
Related: `464` / `465` visual floor editor

---

## Problem

Creating a floor plan returned **403**. Root cause: backend `node_modules/@mosehxl/types` was stale, so `PERMISSIONS.manage_floor_plan` was **`undefined`**. `requirePermission(undefined)` always denied. Admin-space routes (documents, planning, …) still worked because they use `requireEstablishmentAdminOrPermission`, which bypasses the permission check for `establishment_admin`.

The UI already listed `manage_floor_plan` via frontend `ALL_PERMISSIONS`; label clarified to match other Administration entries.

---

## Fix

1. Synced `@mosehxl/types` to **1.0.1** (includes `manage_floor_plan` + admin-space keys).
2. Floor plan/table **writes** use `requireEstablishmentAdminOrPermission(manage_floor_plan)` — establishment admins always allowed; staff need the checkbox.
3. Plan/table **catalog reads** allow establishment admin, or `access_pos` / `manage_floor_plan`.
4. Migration `2026_08_27_15_00_00_backfill_manage_floor_plan_for_est_admins.sql` grants the permission to all active establishment_admin memberships.
5. User settings label: **Administration — Plans de tables**.

---

## Verify

1. Restart backend after types sync / `npm install` in `MuseBar/backend`.
2. As establishment admin: Administration → Plans de tables → create a plan (no 403).
3. Utilisateurs → Permissions → checkbox **Administration — Plans de tables** present; can grant to staff.
4. `node -e "console.log(require('@mosehxl/types').PERMISSIONS.manage_floor_plan)"` prints `manage_floor_plan`.
