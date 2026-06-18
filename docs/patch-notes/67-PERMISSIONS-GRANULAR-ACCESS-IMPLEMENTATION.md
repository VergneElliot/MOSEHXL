# 67 — PERMISSIONS: Granular access (IMPLEMENTATION)

Date: 2026-04-22  
Branch: `development`  
Status: **Steps A–C implemented** (registry, migration, route wiring, UI). Tests (Step E) optional follow-up.

This document is the **implementation** companion to `docs/patch-notes/66-PERMISSIONS-GRANULAR-ACCESS-PLAN.md`. It records **concrete API routes** discovered in the codebase and the **proposed permission keys** for each (from plan 66).

---

## 1) Step A — Endpoint inventory (ground truth)

### 1.1 How HTTP paths are mounted

| Mount (from `MuseBar/backend/src/app.ts`) | Router module |
|------------------------------------------|---------------|
| `/api/orders` | `src/routes/orders/index.ts` (CRUD at `/`, payment under `/payment`, legal under `/legal`, audit under `/audit`) |
| `/api/categories` | `src/routes/categories.ts` |
| `/api/products` | `src/routes/products.ts` |
| `/api/auth` | `src/routes/auth.ts` (mounts `authLogin`, `authRegister`, `authPassword`) |
| `/api/user-management` | `src/routes/userManagement/index.ts` (only `/invitations/*` is registered today) |
| `/api/printing` | `src/routes/printing.ts` |
| `/api/settings` | `src/routes/settings.ts` |
| `/api/legal` | `src/routes/legal/index.ts` |

---

### 1.2 Money-moving / “dangerous” order operations (must be server-gated)

All **full paths** below assume the mount prefix (e.g. `POST /api/orders/...`).

| Method & path | Source file | Business action (what the handler does) | Current guards | Proposed permission key (plan 66) |
|---------------|---------------|----------------------------------------|----------------|----------------------------------|
| `POST /orders/payment/cancel-unified` | `src/routes/orders/orderCancel.ts` | **Unified cancellation** of a completed order (reversal lines, legal journal, audit). Used from History. | `requireAuth` + establishment via `getEstablishmentId` | `orders_cancel` |
| ~~`POST /orders/payment/retour`~~ | *(removed — was unused; POS did not call it.)* | Historique uses **`cancel-unified` only** (`useHistoryAPI.ts`). |
| `POST /orders/payment/change` | `src/routes/orders/orderChange.ts` | **“Faire de la monnaie”** (card→cash change operation). | `requireAuth` + establishment | `access_pos` (v1) — no separate key in plan; revisit if you want `pos_cash_register_change` later |
| `PUT /orders/:id` | `src/routes/orders/orderCRUD.ts` | Generic order update. | `requireAuth` (router-level) + establishment in model | Tighten in B/C: if still needed, align with the same money rules as the flows that call it; if unused from clients, consider deprecating or admin-only |
| `DELETE /orders/:id` | `src/routes/orders/orderCRUD.ts` | Hard delete row (not used by the React app). **`status === 'completed'` → 403`** (use Historique / `cancel-unified` instead). | `requireAuth` + `requireEstablishmentAdmin` | Rare (e.g. draft/pending cleanup only) |

**Note:** the History UI in the app calls **`cancel-unified` only** (see `MuseBar/src/hooks/useHistoryAPI.ts`); `retour` and `change` are used from POS (`MuseBar/src/hooks/usePOSAPI.ts`).

---

### 1.3 POS “Offert / Perso / manual Happy Hour” — **not separate HTTP endpoints**

**Creation path (cashier check-out):** `POST /api/orders` — `src/routes/orders/orderCRUD.ts`

The browser sends **line items** on the same endpoint used for every sale. The client maps UI state to the JSON body in `MuseBar/src/services/api/orders.ts`:

| Client intent | Fields sent to `POST /api/orders` (items[]) | Proposed key |
|--------------|---------------------------------------------|-------------|
| Happy Hour (including **manual** button in the cart) | `happy_hour_applied`, `happy_hour_discount_amount` | `pos_happyhour_manual` **only when the discount is from the manual action** (see “gap” below) |
| Offert (free line) | `total_price: 0`, `unit_price: 0`, `tax_amount: 0`, `description` contains **`[Offert]`** | `pos_apply_offert` |
| Perso (staff line) | same + **`[Perso]`** in `description` | `pos_apply_perso` |

**Detection for Offert / Perso (server, v1):** match `description` with case-sensitive markers `[Offert]` and `[Perso]` (as produced by `MuseBar/src/hooks/usePOSOrderAdjustments.ts`).

**Gap (must be fixed in implementation before reliable `pos_happyhour_manual` enforcement):**

- The client tracks **`isManualHappyHour`**, but **`createOrder` only sends** `happy_hour_applied: item.isHappyHourApplied` and does **not** send whether the application was **manual** vs **automatic**.
- The API therefore **cannot** distinguish:
  - automatic Happy Hour (when the schedule is active) vs
  - manual button (`isManualHappyHour: true` on the line)

  **Resolution (recommended in Step B/C):** add a boolean on each line item, e.g. `is_manual_happy_hour` or `manual_happy_hour: boolean`, in both the request body and `order_items` / audit trail, and set it in `createOrder` in `MuseBar/src/services/api/orders.ts`. Until then, the backend can only gate **all** `happy_hour_applied` or none.

**Read path:** `GET /api/orders` and `GET /api/orders/:id` are used for history/printing. Per plan 66, **no** `access_history` — keep as authenticated establishment users (as today: `requireAuth` + establishment).

---

### 1.4 Settings (includes Happy Hour configuration)

| Method & path | Source file | Action | Current guards | Proposed key |
|---------------|--------------|--------|----------------|--------------|
| `GET /api/settings/happy-hour` | `src/routes/settings.ts` | Read Happy Hour config | `requireAuth` + establishment | `access_settings` |
| `PUT /api/settings/happy-hour` | `src/routes/settings.ts` | Write Happy Hour config | `requireAuth` + establishment | `access_settings` |

Other establishment settings, if added under `/api/settings/*`, should follow the same key unless you later split them in a future patch.

**Legal / business card (settings-adjacent):**

| Method & path | Source file | Proposed key |
|---------------|-------------|-------------|
| `GET /api/legal/business-info` | `src/routes/legal/businessInfo.ts` | `access_settings` (read) |
| `PUT /api/legal/business-info` | `src/routes/legal/businessInfo.ts` | `access_settings` (write) |

---

### 1.5 Menu management (page permission)

`requireAuth` + establishment on all routes in:

- `src/routes/categories.ts` → `/api/categories/...`
- `src/routes/products.ts` → `/api/products/...`

**Proposed key:** `access_menu` for all mutating methods (`POST`, `PUT`, `DELETE`, restore, archive) and optionally **GET** if you want “read menu without edit” (plan 66 only defined page-level access; default is one key for the whole screen).

---

### 1.6 Clôtures (page permission)

Under `/api/legal/closure/...` — `src/routes/legal/closure.ts`

All use `requireAuth` and `req.user.establishment_id` for establishment scoping. Mutating `POST` routes include daily/weekly/monthly/annual and generic `create`, plus bulletins / status `GET` endpoints.

**Proposed key:** `access_closure` (or keep legacy DB name `access_compliance` and rename in UI per plan 66).

**Compliance tab / stats:** e.g. `GET /api/legal/compliance/...` — plan 66 says **broadly accessible for now**; do not add a hard block in the first A4 pass unless a route is clearly dangerous.

---

### 1.7 Gestion des utilisateurs & invitations (escalation risk)

#### A) Establishment user CRUD + permissions (primary surface)

Mounted under `/api/auth` from `src/routes/authRegister.ts` (all paths below are **`/api/auth/...`**):

| Method & path | Action | Current guards |
|---------------|--------|----------------|
| `GET /auth/users` | List users in establishment | `requireAuth` + `requireEstablishmentAdmin` |
| `POST /auth/users` | Create user in establishment | `requireEstablishmentAdmin` |
| `DELETE /auth/users/:id` | Delete user | `requireEstablishmentAdmin` |
| `PUT /auth/users/:id/role` | Change role | `requireEstablishmentAdmin` |
| `GET /auth/users/:id/permissions` | Read permission list | `requireEstablishmentAdmin` |
| `POST /auth/users/:id/permissions` | Set permissions (alias) | `requireEstablishmentAdmin` |
| `PUT /auth/users/:id/permissions` | Set permissions (frontend) | `requireEstablishmentAdmin` |

**Frontend in use today:** `MuseBar/src/components/Admin/UserManagement/hooks/*.ts` calls these.

**A4 target:** replace or complement `requireEstablishmentAdmin` with **`requireAuth` + `requirePermission('access_user_management')`**, with an explicit rule in code: **`establishment_admin` still passes** (see `UserModel.getUserPermissions` — admins without explicit `user_permissions` rows already receive *all* permission **names** from the `permissions` table). Staff with `access_user_management` can then be granted management without being `establishment_admin`.

#### B) Invitations (secondary surface — must not stay “any staff in tenant”)

Mounted under `/api/user-management/invitations` (see `src/routes/userManagement/invitationRoutes.ts`).

| Method & path | Action | Current guards (summary) | A4 note |
|---------------|--------|--------------------------|---------|
| `POST /user-management/invitations/send-user-invitation` | Invite user to establishment | `requireAuth` + body `establishmentId` must match caller’s `establishment_id` (unless system admin) | **Any authed user in the establishment** can call this today — **treat as part of `access_user_management`** in Step C |
| `GET /user-management/invitations/pending-invitations` | List pending | `requireAuth` | same |
| `DELETE /user-management/invitations/cancel-invitation/:id` | Cancel | `requireAuth` | same |
| `POST /user-management/invitations/resend-invitation/:id` | Resend | `requireAuth` | same |
| `POST /user-management/invitations/accept-invitation` | Public accept (token) | unauthenticated (token in body) | out of scope for permission matrix |

`POST /user-management/invitations/send-establishment-invitation` is **system** flow (`requireAdmin` / `system_admin`) — stays separate from `access_user_management`.

---

### 1.8 Printing, audit, and legal “extras” (defer or special-case)

| Area | Path(s) | Note |
|------|---------|------|
| Printing | `/api/printing/...` + `printingCompat` | Plan 66: no new permission; keep **authenticated** + establishment as today |
| Order audit | `/api/orders/audit/...` | `requireAuth` — confirm product need for a dedicated permission later |
| Order legal | `/api/orders/legal/journal-entry` | **Hardened:** `requireAuth` + **`requireEstablishmentAdmin`**, order must exist in caller’s establishment, `userId` from JWT only; `npm test` includes route-level checks (see `orderLegal.journalEntry.test.ts`). |
| `GET /api/orders` | list | Stays open to establishment users (no `access_history`) |

---

## 2) Resolutions to plan 66 “open questions” (from Step A)

1. **Cancel from History** — the app uses **`POST /api/orders/payment/cancel-unified`** only (see `useHistoryAPI.ts`). The old **`/payment/retour`** route was removed: it was not wired from the POS UI.
2. **“Discount endpoints”** — there are **no** separate `/discount` routes. Everything goes through **`POST /api/orders`** with line payload as in §1.3. **Implemented:** `is_manual_happy_hour` on each line + DB column `order_items.is_manual_happy_hour`; client sends it from `isHappyHourApplied && isManualHappyHour`.
3. **Printing** — no new key; unchanged from plan 66.
4. **Compliance** — keep permissive for now; closure routes get `access_closure` per plan.

---

## 3) Implementation summary (Steps B–C)

| Area | What was done |
|------|----------------|
| Registry | `MuseBar/backend/src/permissions/registry.ts` exports `P.*` keys. |
| Middleware | `requireAnyPermission`, `requireEstablishmentAdminOrPermission`; `assertPosOrderLinePermissions` on `POST /api/orders`. |
| `UserModel.getUserPermissions` | **establishment_admin** always receives **all** permission names from DB (ignores partial `user_permissions` rows). |
| Migrations | `2026_04_22_12_00_00_granular_permissions.sql` — new keys, rename `access_compliance` → `access_closure`, migrate `access_happy_hour` → `pos_happyhour_manual`, drop `access_history`, add `order_items.is_manual_happy_hour`. |
| Backfill | `2026_04_22_12_01_00_backfill_pos_permissions_for_access_pos.sql` — users with `access_pos` also get `pos_happyhour_manual`, `pos_apply_offert`, `pos_apply_perso`, `orders_cancel` (reduces breakage; owner can revoke). |
| Settings | `GET /api/settings/happy-hour` requires `access_pos` **or** `access_settings`; `PUT` requires `access_settings` only. |
| Frontend | `ALL_PERMISSIONS` updated; AppRouter: Historique + Conformité légale without extra keys; Clôtures → `access_closure`; Gestion utilisateurs → `access_user_management`; POS hides HH/Offert/Perso buttons without perms; Historique hides retour without `orders_cancel`. |

## 4) Follow-up fixes (clarifications)

- **Gestion utilisateurs tab:** the tab list required `access_user_management` in `user.permissions` but the panel already allowed `establishment_admin`. The filter now matches: **tab visible if `role === 'establishment_admin'` OR `access_user_management`**. (No mix-up with `system_admin` — that role does not use this business UI.)
- **`POST /payment/retour`:** removed; Historique is the only return path (`cancel-unified`). Dead POS hook/state removed.
- **`DELETE /orders/:id`:** returns **403** for `status === 'completed'` (validated orders); not used by the app.

## 5) Optional follow-up (Step E) — **done**

- **Unit tests (Vitest):** `MuseBar/backend/src/middleware/auth.permission.test.ts` — `requirePermission` / `requireAnyPermission` (including the `P.orders_cancel` case used by `POST /api/orders/payment/cancel-unified`). Run: `cd MuseBar/backend && npm test`.
- **Journal entry hardening:** `POST /api/orders/legal/journal-entry` is restricted as above; `MuseBar/backend/src/routes/orders/orderLegal.journalEntry.test.ts` covers 403/404/201 and `userId` from token.
- **Auth module split:** `MuseBar/backend/src/routes/authSession.ts` mounts login/register/password; `routes/auth.ts` re-exports **middleware only** to avoid circular init when the app tree loads.
