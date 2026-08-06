# 447 - Multi-Establishment Memberships & Venue Switching - Implementation

Date documented: 2026-08-06 (work landed 2026-07-30 → 2026-08-05)  
Runbook: `docs/runbooks/MULTI-ESTABLISHMENT-MEMBERSHIPS.md` (model + migration edge cases)

---

## 1) Context — one login, several venues

Before this change, a user row *belonged* to exactly one establishment
(`users.establishment_id`). If the same person worked at two venues, they needed two
accounts with two emails — and duplicate emails had actually crept into the database.

Now a user is a **login identity** (email + password + MFA) and access to venues is a
separate concept: a **membership**. One person can be admin of venue A and staff at venue B,
and switch between them from the app header without logging out.

---

## 2) Database — migration `2026_07_30_16_00_00_user_establishment_memberships.sql`

### New table `user_establishment_memberships`

| Column | Notes |
|---|---|
| `user_id` / `establishment_id` | FKs, `UNIQUE (user_id, establishment_id)` |
| `role` | `establishment_admin` \| `staff` (per venue!) |
| `is_active` | Soft disable |

### What the migration does, in order

1. **Seeds** one membership per existing venue-bound user (role derived from
   `users.role`, falling back to `is_admin`).
2. **Venue-scopes permissions**: `user_permissions` gains an `establishment_id` column
   (backfilled, then NOT NULL) and its primary key becomes
   `(user_id, permission_id, establishment_id)` — the same permission can now differ per
   venue.
3. **Merges duplicate emails**: for each `LOWER(email)` group it picks a canonical user
   (prefer `system_admin`, then most recent `last_login`, then highest `id`), moves
   memberships/permissions onto it, remaps or deletes refresh tokens and planning ICS
   tokens of the losers, and deletes the loser rows. (Consequences — e.g. losers' MFA
   secrets and passwords are discarded — are detailed in the runbook.)
4. **Syncs the cache**: `users.establishment_id`/`users.role` remain as a "last active
   venue" cache, refreshed on login and on switching.
5. **Enforces** `UNIQUE (LOWER(email))` so duplicates can never return.

New model `models/membership.ts` (`MembershipModel`) wraps all of this:
`listForUser`, `get`, `resolveActive`, `upsert`, `remove` (deletes venue permissions +
membership in one transaction and repoints the cache), `setActiveEstablishment`,
`listUsersForEstablishment`.

---

## 3) Auth flow changes

- **JWT shape unchanged**: `{ id, email, role, establishment_id }` — but `role` and
  `establishment_id` now describe the **active membership**. Request middleware keeps
  working purely off the token (no extra DB round-trip per request).
- **`POST /api/auth/login`** resolves the active membership, refreshes the cache, and now
  returns `memberships: [{ establishment_id, name, role }]` **and real venue-scoped
  `permissions`** (login previously returned an empty permissions array).
- **New `POST /api/auth/switch-establishment`** (`sessionRoutes.ts`): body
  `{ establishment_id }`. Verifies the caller has an active membership there, updates the
  cache, audits `SWITCH_ESTABLISHMENT`, and returns a **fresh access token** plus a
  `/me`-shaped user for the new venue. System admins are rejected (they impersonate
  instead).
- **`GET /api/auth/me`** also returns `memberships`.
- Permission gates (`requirePermission` etc.) now call
  `UserModel.getUserPermissions(userId, establishment_id)` — always scoped to the active
  venue from the JWT.

### User creation / linking

- **`POST /api/auth/users`**: if the email already exists, no second user row is created —
  the existing account is **linked** with a membership (`linked_existing: true`, audit
  `LINK_USER_MEMBERSHIP`). Already-a-member → `MEMBERSHIP_EXISTS` error. Passwords are only
  required for genuinely new accounts.
- **`DELETE /api/auth/users/:id`** removes the *membership* (plus that venue's
  permissions) via `MembershipModel.remove` — it no longer nukes a person's whole account
  when they still work elsewhere.
- Establishment-admin invitations and the account-creation orchestrator both upsert
  memberships now (`ESTABLISHMENT_ADMIN_LINKED` vs `ESTABLISHMENT_ADMIN_CREATED` audits).
- Known gap: the *user* invitation path (`acceptUserInvitation`) still inserts a bare user
  without a membership row — flagged for follow-up.

---

## 4) Frontend — `useAuth` becomes a provider

`hooks/useAuth.ts` → **`useAuth.tsx`**: auth state moved from a per-component hook into a
single **`AuthContext` + `AuthProvider`** (JSX ⇒ `.tsx`), mounted around `<App />` in
`index.tsx`. Everything now shares one auth state — no more duplicated token refresh
timers. The hook exposes the same state plus `authReady` (initial restore finished) and a
new **`switchEstablishment(establishmentId)`** action that calls the new endpoint and swaps
token/user/permissions in place.

`AppHeader.tsx`: when a non-system-admin user has **more than one membership**, their name
becomes a menu listing their venues (with a checkmark on the current one). Picking another
venue re-issues the token and reloads the catalog and happy-hour data. Tests moved to
`useAuth.test.tsx` and wrap renders in `<AuthProvider>`.

`types/auth.ts` adds `EstablishmentMembershipSummary` and `User.memberships`.

---

## 5) Tests updated

`auth.permission.test.ts`, `user.permissionMode.test.ts`, `authLogin.sessionRoutes.test.ts`
and the `authRegister.*.test.ts` family were updated for the establishment-scoped
`getUserPermissions` signature and the membership mocks.

---

## 6) Rollback

The migration has a DOWN section (drops the memberships table and de-scopes
`user_permissions`) — but note the duplicate-email merge is **not reversible**: deleted
loser accounts stay deleted. Take a DB backup before migrating production.
