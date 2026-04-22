# 65 — AUTH: Separate system admin vs establishment admin (IMPLEMENTATION)

Date: 2026-04-22  
Branch: `development`  
Related plan: `64-AUTH-ROLES-ADMIN-SEPARATION-PLAN.md`

---

## Summary (what this patch achieves)

This patch implements a clean, enforced 3-tier user model:

- `system_admin` — platform/system administrator (no establishment scope)
- `establishment_admin` — administrator of one establishment
- `staff` — establishment user whose access is controlled by granular permissions

The previous system conflated system admin and establishment admin through a legacy boolean (`users.is_admin`) combined with JWT minting logic. That caused establishment admins to be treated as system admins in the UI and in backend gates.

After this patch:

- The backend treats **`users.role` as the source of truth**
- JWT roles are **normalized** to the canonical set
- Establishment flows no longer create users with `is_admin=true`
- Existing DB rows are backfilled into the canonical roles
- The frontend reflects roles correctly and no longer relies on `is_admin` to display “admin”

---

## Canonical roles (final)

Supported roles after this patch:

- `system_admin`
- `establishment_admin`
- `staff`

Legacy role mapping (migration + login normalization):

- `system_operator` → `system_admin`
- `admin` → `establishment_admin`
- `cashier` / `manager` → `staff`

---

## Backend changes

### 1) JWT minting now uses DB role (normalized)

File: `MuseBar/backend/src/routes/authLogin.ts`

- `POST /api/auth/login`: role is derived from DB role first, not forced by `is_admin`.
- `POST /api/auth/refresh`: same logic.

Normalization rules ensure the token always contains one of:
`system_admin` / `establishment_admin` / `staff`.

### 2) System-admin gate is role-based

File: `MuseBar/backend/src/middleware/auth.ts`

- `requireAdmin` now checks:
  - `req.user.role === 'system_admin'`
- `requirePermission` “admin bypass” is now also role-based:
  - `req.user.role === 'system_admin'`

This removes reliance on `req.user.is_admin` for authorization decisions.

### 3) Establishment account creation flows no longer set `is_admin=true`

Files:

- `MuseBar/backend/src/services/setup/userAccountOperations.ts`
  - setup wizard now creates/updates the establishment owner as:
    - `role = 'establishment_admin'`
    - `is_admin = false`

- `MuseBar/backend/src/services/userInvitation/invitationAcceptance.ts`
  - accepting an establishment invitation now creates:
    - `role = 'establishment_admin'`
    - `is_admin = false`
  - accepting a user invitation now creates:
    - `role = 'establishment_admin'` if invited as such; otherwise `staff`
    - `is_admin = false`

---

## Database migration (backfill / normalization)

File:

- `MuseBar/backend/src/migrations/files/2026_04_22_00_00_00_auth_roles_admin_separation.sql`

This migration:

1. Normalizes legacy roles into the canonical set
2. Fills missing roles using least-privilege defaults
3. Repairs invalid combinations (e.g. `system_admin` with an `establishment_id`)
4. Ensures the legacy boolean matches the canonical role:
   - `is_admin = (role = 'system_admin')`

Note: `-- DOWN` is a no-op because restoring the old role strings is not reliably possible.

---

## Frontend changes

### 1) System Admin UI: removed unused `system_operator`

Files:

- `MuseBar/src/types/system.ts`
- `MuseBar/src/components/SystemAdmin/Users/SystemUserForm.tsx`
- `MuseBar/src/components/SystemAdmin/Users/CreateSystemUserDialog.tsx`
- `MuseBar/src/components/SystemAdmin/Users/SystemUsersStats.tsx`

The `system_operator` option was unused/placeholder, so it was removed for now (mapped to `system_admin` in the backend if it ever appears in DB).

### 2) Establishment user management is role-based

Files:

- `MuseBar/src/components/Admin/UserManagement/hooks/useUserActions.ts`
  - `isAdmin` is derived from `role === 'establishment_admin'` (not `is_admin`)
  - non-admin users are created/updated with role `staff` (not `cashier`)

- `MuseBar/src/components/Admin/UserManagement.tsx`
  - Replaced “Admin: Oui/Non” with a “Rôle” column:
    - establishment admin → “Administrateur établissement”
    - otherwise → “Staff”

---

## Verification performed (manual)

Using the single existing establishment (Muse Bar) and two accounts:

- `elliot.vergne@gmail.com` was detached from the establishment and set to:
  - `role = system_admin`
  - `establishment_id = NULL`
- `elliotpokerpro@gmail.com` remained:
  - `role = establishment_admin`
  - `establishment_id = <Muse UUID>`

Results:

- System admin account routes to the **System Admin UI**
- Establishment admin account routes to the **Business/POS UI**

---

## Follow-ups

1. **Permissions model refinement** (A4): now that roles are correct, we can re-define and enforce staff permissions cleanly.
2. **Remove `users.is_admin`**: after A4 and after confirming no remaining dependencies, we can drop the legacy boolean entirely and rely only on `users.role`.

