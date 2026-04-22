# 66 — PERMISSIONS: Granular, action-level access (PLAN)

Date: 2026-04-22  
Branch: `development`  
Status: Plan only (no code changes in this document)

---

## 0) Context: why A4 is needed now

We completed **A2** (roles) so we have a clear separation of:

- `system_admin` (platform)
- `establishment_admin` (tenant)
- `staff` (permissions-driven)

A4 is the next step: make **authoritative permission checks in the backend**, not only in the React UI. Today, many “permissions” are effectively **UI tab visibility** because `requirePermission()` is rarely applied on routes, while `establishment_admin` is granted all permission names as a default.

### Non‑negotiable policy: `establishment_admin` is always “all powerful” inside the establishment

For operational safety and because the establishment admin is usually the **owner/boss**:

- **Every `establishment_admin` user must always have *all* permissions** (current + future keys we add in A4), by default.
- This prevents accidental lockouts where the owner cannot fix staff permissions.

Staff users (`staff`) are the real target of permission gating.

Your screenshot shows the current permission editor driving a **small set of coarse keys** (aligned with the main app areas). You want to keep that pattern where it’s enough (e.g. a single clôture page permission), but you also need **finer inside-page permissions** (e.g. “cancel an order from History” is separate from “view History/print”), plus **Gestion des utilisateurs** as its own page permission.

This document is the A4 “contract”: what we will add, what we will deprecate, and how we will migrate without breaking your existing customers.

---

## 1) What you are asking for (requirements, translated into product rules)

### 1.1 Caisse / POS

- **Keep** a core POS access permission (`access_pos`), but it must be able to be **narrow**:
  - A user can be allowed to sell, but not allowed to apply certain **discount levers** you listed:
    - **Manual Happy Hour** (the **Happy Hour button in the order summary / cart area in POS** — not “tab access”)
    - “offert”
    - “perso” (custom discount)
- These are **not** “tab permissions” — they are **actions inside the POS** and must be enforced **server-side** on the endpoints that perform those operations.

### 1.2 HappyHour permission cleanup

- The old `access_happy_hour` was meant for a dedicated Happy Hour settings area, but you moved Happy Hour configuration into **Settings**.
- We should **delete/retire** `access_happy_hour` as a standalone “tab permission”.
- Replace it with the **real** Happy Hour permission you want:
  - **Permission to use the manual Happy Hour button in the POS order summary** (section 2.2).
- Happy Hour **configuration** remains under **Settings** and is covered by the normal page permission:
  - **`access_settings` includes Happy Hour settings** (no extra sub-permission needed for v1).

### 1.3 Menu

- `access_menu` can remain a **page-level** permission (menu management screen).

### 1.4 History

- You do **not** want a dedicated `access_history` permission.
- **Viewing history + printing receipts should be accessible to all establishment users** (staff included), per your guidance.
- The only thing that must be permission-gated is **order cancellation / return / void-like operations** initiated from History (whatever API routes those actions use).

### 1.5 Paramètres

- `access_settings` remains a page-level permission for the settings area.
- It **includes Happy Hour settings** (since that UI lives inside Settings now).

### 1.6 Clôtures / conformité

- **Clôtures** should remain a simple **page access** permission (one key for the whole closure area).
- The “conformité” tab may or may not be useful long-term; for A4 we can:
  - keep it **open** (no permission) for now, and revisit later, **or**
  - keep it visible but non-functional without blocking staff (product decision deferred)

### 1.7 Gestion des utilisateurs / “Permissions” page (critical)

This was an important omission:

- The **User management** screen (“Gestion utilisateurs”) — where permissions are edited — **must have its own permission**.
- Otherwise staff could bypass every other restriction by granting themselves permissions.

We will add a dedicated key (see section 2.1) and enforce it on:

- the UI route / tab
- the backend routes that list users and modify permissions/roles (exact endpoints in Step A inventory)

---

## 2) Proposed permission model (keys + meaning)

We will use **string keys** stored in the `permissions` table and `user_permissions`, as today.  
To avoid a huge matrix, we will use **namespaced keys**:

### 2.1 Page / module access (broad, optional)

These map closely to the left navigation, but are not the whole story.

| Key | Intent |
|-----|--------|
| `access_pos` | Can open the POS (cashier) experience |
| `access_menu` | Can use menu management |
| `access_settings` | Can open settings (**includes Happy Hour settings**) |
| `access_user_management` | Can open **Gestion des utilisateurs** and edit user permissions/roles (critical) |
| `access_closure` | Can open the **clôture / closure** area (page-level) |
| (optional / deferred) | “Conformité” tab: keep free access for now; permission can be added later if needed |

> Notes:
> - We will **not** add `access_history` (history viewing/printing is generally allowed).
> - `access_happy_hour` is **deprecated/removed** and replaced by **POS action keys** (section 2.2) + settings coverage via `access_settings` (per your product rules).
> - If the database still contains the legacy key `access_compliance`, we can either:
>   - keep it temporarily and only rename the label in UI, **or**
>   - migrate in SQL to `access_closure` (documented in patch 67)

### 2.2 POS action permissions (new)

| Key | Intent |
|-----|--------|
| `pos_happyhour_manual` | Can use the **manual Happy Hour** control in the **POS order summary / cart area** (this replaces the old `access_happy_hour` *meaningfully*) |
| `pos_apply_offert` | Can apply an “offert” discount from the POS order summary area |
| `pos_apply_perso` | Can apply a “perso” custom discount from the POS order summary area |
| `pos_refund_item` (optional) | If the POS can trigger partial refunds/returns in POS, separate it from history cancel |

(Exact list will be derived from the actual code paths: which endpoints the POS uses.)

### 2.3 History / orders dangerous actions (new, critical)

| Key | Intent |
|-----|--------|
| `orders_cancel` | Can cancel/void/return an order (whatever your product calls it) from History and/or other flows |
| (no reprint key by default) | Printing stays broadly accessible; we will not add `orders_reprint` unless you explicitly want it later |

---

## 3) What exists today (baseline facts we must not ignore)

1. **Backend** has `requirePermission(permission: string)` but it was historically unused in most routers.
2. `UserModel.getUserPermissions` grants **all** permissions to `establishment_admin` by default, which is fine for now, but means **staff** are the real target of gating.
3. Frontend has `ALL_PERMISSIONS` in `MuseBar/src/types/auth.ts` and also tab-level filtering in `MuseBar/src/components/common/AppRouter.tsx`. That’s UI only.

A4 will change (2) and (1): staff permissions become meaningful because routes enforce them.

---

## 4) Migration + compatibility strategy (how we don’t break prod)

### 4.1 Add new permissions rows in DB (migration)

We will add rows into `permissions` for every new key, with `ON CONFLICT` safety if a unique name exists.

### 4.2 Deprecate `access_happy_hour`

Per your latest guidance, the most likely mapping is:

- Old `access_happy_hour` (tab) → new `pos_happyhour_manual` (POS button action)
- No separate “settings happy hour” permission, because:
  - Happy Hour **configuration** is already covered by `access_settings`

We will still verify what data exists in real DBs during implementation (some environments may not have the old key at all).

We will **confirm mapping with you** in implementation step 1 (a short decision table in the implementation notes).

### 4.3 Backfill defaults for `establishment_admin`

Hard requirement (updated):

- **`establishment_admin` always implicitly has all permissions** (current + new keys we introduce in A4).
- Implementation should remain robust even if a new permission key is added later:
  - code-level “full access for establishment admin” is preferred over re-running migrations for every new key

### 4.4 Staff defaults

- When creating staff users, default to a safe baseline (example — final defaults will be written in the implementation notes):
  - `access_pos` and **no** `orders_cancel` / no POS discount actions unless you explicitly set them
- This is a product decision; we can default conservatively to avoid surprise lockouts in dev.

---

## 5) Implementation plan (phased, step by step)

### Step A — Inventory dangerous endpoints (read-only, code map)

**Goal:** list every API route that performs:

- order cancellation/return/void
- payment adjustments
- discount application
- any “administrative” operation inside POS/History
- user management: listing users, inviting/creating users, and **assigning permissions / roles** (must be covered by `access_user_management`)

Deliverable: a table `route file → method → business action → proposed permission key`.

This becomes the “ground truth” for what we must protect in A4.

### Step B — Permission registry in code (single source of truth)

**Goal:** avoid typos and drift between UI and server.

- Create a small `permissions/registry.ts` (backend) exporting:
  - all permission key constants
  - metadata (label FR, description, default staff grants optional)

- Update frontend to import/duplicate carefully:
  - either a shared file (future), or a mirrored list with a CI check (later)
  - minimum for now: keep `ALL_PERMISSIONS` in sync with DB seed/migration

### Step C — Apply `requirePermission` to routes (the real A4 work)

**Pattern:**

- `requireAuth`
- `getEstablishmentId` (for establishment routes)
- `requirePermission('orders_cancel')` (example)

**Rules:**

- `establishment_admin` keeps full access (as today via `getUserPermissions` default).
- `system_admin` should not hit establishment POS routes in normal use; if they can today, A4 is also a good moment to add explicit 403s (optional but recommended).

### Step D — Update the permission editor UI (your screenshot)

- Replace/extend the list with:
  - keep broad toggles
  - add: **Gestion des utilisateurs** (`access_user_management`) — *must be present* or the whole system is bypassable
  - add a second section: “actions POS / caisse”
  - add a second section: “actions historique / commandes”
- This can be a second dialog step later; MVP can be a longer checkbox list with subsection titles.

### Step E — Tests (minimum viable)

- Add backend tests (even if the repo is light today) for:
  - “staff without `orders_cancel` cannot POST cancel”
  - “staff with permission can”
  - (recommended) “staff without `access_user_management` cannot modify permissions / open admin-only user routes”

If backend tests are not wired yet, we can start with 1–2 focused tests + run them in CI.

### Step F — Patch notes: implementation

File: `docs/patch-notes/67-PERMISSIONS-GRANULAR-ACCESS-IMPLEMENTATION.md` will document:

- final permission keys
- mapping from old `access_happy_hour`
- routes protected
- any manual data fixes

### Step G — Commit + push

One commit (or two: `feat` + `docs`) to keep history clear.

---

## 6) Open questions we will resolve in implementation (not blockers for planning)

1. **Exact product behavior** for “cancel from History”:
   - Is it a single API (`cancel-unified`) or also `retour`?
2. **Discount endpoints** in POS: which request bodies correspond to offert/perso/hh?
3. **Printing**:
   - default: no extra permission; printing remains accessible for staff as requested.
4. **Compliance tab**:
   - default for A4: keep **free access**; revisit later (optional permission key) once the product direction is clear.

(1)–(2) are answered in `docs/patch-notes/67-PERMISSIONS-GRANULAR-ACCESS-IMPLEMENTATION.md` §1.2 and §1.3.

---

## 7) Security note (why this is not just UI)

If permissions are only enforced in React, a malicious user can call the API with a normal token. A4’s purpose is to ensure **the backend refuses** unauthorized staff actions, especially cancellation, money-moving operations, and **permission escalation** (the user management APIs must be gated, not just hidden in the UI).

---

## 8) Relationship to A3 (legal journal / multi-tenant)

A3 and A4 are related but not blocking each other in planning:

- A3 is about **data isolation and fiscal correctness**
- A4 is about **who can do what** inside an establishment

We can implement A4 while A3 is scheduled; just avoid entangling them in a single commit.

---

## 9) Rollback plan

- If a permission rollout locks users out:
  - establishment admins can still recover (they’re meant to be full access)
  - or temporarily relax specific `requirePermission` in one route (hotfix) while we adjust defaults

The safest operational rollback is: “grant the missing permission to the affected user(s)” via the existing permissions UI, once the keys exist.

---

## 10) Next action

- **Step A (endpoint inventory + proposed key mapping) is done** in `docs/patch-notes/67-PERMISSIONS-GRANULAR-ACCESS-IMPLEMENTATION.md` (§1).
- **Next:** **Step B** (permission key registry in code + DB migration for new names), then **Step C** (wire `requirePermission` to the routes listed in doc 67).
