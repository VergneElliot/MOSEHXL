# 64 — AUTH: Separate system admin vs establishment admin (PLAN)

Date: 2026-04-22  
Branch: `development`  
Status: Plan only (no code changes in this document)

---

## 0) The target user model (what “correct” means)

You described a **3-tier** model. We will implement and enforce it exactly:

1. **System admin** (platform operator)
   - Can create / delete establishments and manage subscriptions (system-level operations)
   - **Must not** access any establishment’s POS data (orders, accounting, etc.)
   - Not attached to an establishment in normal usage (`establishment_id = null`)

2. **Establishment admin** (tenant owner)
   - Admin of **exactly one** establishment
   - Can use the POS, settings, legal/compliance tabs, user management inside their establishment
   - Can create and manage staff users for their establishment

3. **Staff** (cashiers/waiters/cooks/etc.)
   - Attached to **exactly one** establishment
   - Has granular permissions assigned by the establishment admin

---

## 1) The current bug (why we need A2)

Today the code **conflates** two different ideas:

- `users.is_admin` boolean (legacy)
- `users.role` string (newer)

And at login/refresh it does this:

- If `is_admin === true` → JWT role is forced to `system_admin` (even if DB role says `establishment_admin`)

So establishment admins can accidentally be treated as system admins.

This is why you see “admins” in MuseBar behaving like “system admins”.

---

## 2) Goal of A2

Make the system **unambiguous** and **enforced server-side**:

- System admin is determined by **role**, not a legacy boolean.
- Establishment users (admins + staff) are always establishment-scoped.
- The backend checks permissions/role correctly.

This step **does not** change the legal-journal multi-tenancy design (A3); it only fixes auth/roles so tenancy boundaries can be trusted.

---

## 3) Design decision (single source of truth)

### Chosen rule

Use **`users.role`** as the single source of truth for authorization.

Canonical roles (the only ones we support after A2):

- `role = 'system_admin'` → system admin
- `role = 'establishment_admin'` → establishment admin
- `role = 'staff'` → establishment staff user (permissions determine access)

Everything else is treated as legacy and mapped during backfill:

- `system_operator` → `system_admin` (kept for future use, but not used right now)
- `admin` → `establishment_admin`
- `cashier` / `manager` / `staff` → `staff` (canonical)

### What happens to `is_admin`?

For now (minimal-risk migration):

- Keep the `users.is_admin` column (to avoid breaking DB schema instantly)
- But treat it as **derived/legacy**:
  - When minting JWTs, use `role` first.
  - Optionally keep `is_admin = (role === 'system_admin')` consistent via migration/backfill.

Later (optional future cleanup):

- Remove the `is_admin` column once everything relies purely on `role`.

---

## 4) Implementation plan (step-by-step)

### Step 0 — This plan doc (you are here)

- File: `docs/patch-notes/64-AUTH-ROLES-ADMIN-SEPARATION-PLAN.md`

### Step 1 — Inventory role values (read-only check)

We will list every distinct `role` value currently used in:

- Backend auth/login/refresh code
- Invitation acceptance and setup wizard code
- User creation routes
- Frontend role routing (System Admin UI vs Business UI)

Goal: identify all legacy/alternate strings (`admin`, `manager`, `establishment_staff`, etc.) so we can map them safely.

### Step 2 — Fix JWT minting (most important)

Update backend login/refresh so JWT role is based on DB role, not `is_admin`:

- File: `MuseBar/backend/src/routes/authLogin.ts`

New logic conceptually:

- Read `role` from DB
- If missing/null, then fall back:
  - if `is_admin === true` → `system_admin`
  - else → `establishment_admin`

This single change prevents establishment admins from being forced into `system_admin`.

### Step 3 — Make `requireAdmin` check role, not boolean

Update:

- File: `MuseBar/backend/src/middleware/auth.ts`

Change `requireAdmin` to:

- Allow only if `req.user.role === 'system_admin'`

Rationale: “system admin” is a **role**, not a boolean.

### Step 4 — Ensure establishment-admin creation paths never set `is_admin=true`

Fix the places that currently set `is_admin=true` for establishment-scoped users:

- `MuseBar/backend/src/services/setup/userAccountOperations.ts`
- `MuseBar/backend/src/services/userInvitation/invitationAcceptance.ts`

Rules:

- Establishment admin → `role = 'establishment_admin'` and `is_admin = false`
- Staff → `role = 'staff'` and `is_admin = false`

### Step 5 — Database backfill migration (data cleanup)

Add a SQL migration in `MuseBar/backend/src/migrations/files/` to repair existing rows.

It will:

- Normalize roles (map legacy strings to the supported set)
- Ensure `is_admin` matches `role` where needed

Example policy (we will refine based on Step 1 inventory):

- If `role IN ('admin', 'establishment_admin')` AND `establishment_id IS NOT NULL` → set `role='establishment_admin'`, `is_admin=false`
- If `role IS NULL` AND `is_admin=true` → set `role='system_admin'`
- If `role='system_admin'` → ensure `establishment_id` is NULL (or decide strict behavior if you want to allow a system admin to “impersonate” a tenant later)

Important: we’ll be careful not to lock you out of the system by accident. We will test on dev DB first.

### Step 6 — Frontend alignment (routing + labels)

Update frontend so “Admin” labels reflect **establishment admin**, not `is_admin`.

Key goal:

- System admin UI is shown only for `role === 'system_admin'`
- Establishment admin UI uses `role === 'establishment_admin'`

We may also rename columns in UI:

- Instead of showing `is_admin` as “Admin”, show `role` (with a friendly label).

### Step 7 — Verification checklist (manual + API)

We will verify with real logins:

- **System admin** account:
  - lands on System Admin UI
  - cannot access establishment POS routes (should not have `establishment_id`)
- **Establishment admin** account:
  - lands on Business UI
  - can manage users for their establishment
  - cannot see system admin screens/routes
- **Staff** account:
  - lands on Business UI
  - sees only tabs permitted
  - cannot access establishment-admin-only routes

We will also verify JWT payloads from `/api/auth/login` and `/api/auth/me`.

### Step 8 — Documentation (implementation notes)

After completing A2 we will write:

- `docs/patch-notes/65-AUTH-ROLES-ADMIN-SEPARATION-IMPLEMENTATION.md`

It will include:

- Files changed
- Role mapping rules applied
- How to create a new establishment so it auto-creates an establishment admin correctly
- Any manual SQL needed for already-deployed environments (if applicable)

### Step 9 — Commit + push

One commit for the completed A2 implementation + docs (or split into 2 commits: code then docs).

---

## 5) Risk management / rollback

### Main risk

Changing auth/roles can accidentally:

- Lock you out of admin UIs
- Misroute users between System Admin and Business UI

### Mitigations

- Do the work in small steps with frequent “can I still login?” checks.
- Keep one known-good system admin user in DB.
- If anything goes wrong:
  - Roll back the commit
  - Or run a small SQL fix to restore your system admin role

---

## 6) Notes about permissions

This A2 plan focuses on “who is system admin vs establishment admin vs staff”.

Granular permissions enforcement on the backend is a separate item (A4). We can do it right after A2, because once roles are correct, permission enforcement becomes reliable.

