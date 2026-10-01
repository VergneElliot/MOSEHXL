---
name: auth-and-multi-tenancy
description: >-
  JWT auth, refresh rotation, CSRF, PIN sessions, permissions, and PostgreSQL
  RLS tenant isolation for MOSEHXL/MuseBar. Use when modifying auth routes,
  middleware, PIN actor tokens, user permissions, establishment switching,
  requireAuth, or any establishment_id scoping.
---

# Auth and Multi-Tenancy

Two identity kinds, two session layers:

| Kind | Rule |
|------|------|
| **Venue login** | `users.can_login = true`, email/password; may have many establishment memberships |
| **PIN staff** | `can_login = false`, one establishment, no usable password; created via `POST /api/auth/pin-staff` |

| Session | Rights |
|---------|--------|
| **Account JWT** | Shell only: open PIN, switch venue (with owner PIN), logout, `/me` — **no feature permissions** |
| **PIN actor JWT** | Sole source of POS / Admin / Settings permissions |

## Account authentication

| Concern | Location |
|---------|----------|
| Routes | `backend/src/routes/authSession.ts`, `authLogin/*`, `authPin.ts`, `pinStaff.ts` |
| JWT sign/verify | `backend/src/security/jwtConfig.ts` |
| Middleware | `backend/src/middleware/auth.ts` — `requirePermission` = **PIN actor only** |
| Refresh + CSRF | `backend/src/routes/authLogin/sessionRoutes.ts`, `cookies.ts` |
| Frontend | `MuseBar/src/hooks/useAuth.tsx`, PIN-first `AppRouter`, `services/api/core.ts` |

Login rejects `can_login = false`. Setup wizard collects email + password + **owner PIN**.

### Token storage (frontend)

- Access JWT: **in memory** via `ApiService.setToken()` — not localStorage
- Refresh: httpOnly cookie `musebar_refresh_token`
- CSRF: cookie `musebar_csrf_token` + header `x-csrf-token` on refresh

## PIN sessions (badges) + pointage

| Layer | Location |
|-------|----------|
| Verify PIN | `POST /api/auth/pin/verify` → opens or **reuses** session + clock-in only on first open |
| Actor token | `pinActorToken.ts` (`token_use: 'pin_actor'`, default **1 day**; `AUTH_PIN_ACTOR_TTL_DAYS`) |
| Close | `POST /api/auth/pin/sessions/:id/close` → **clock-out**; blocked if open tables |
| Pointage glue | `services/auth/pinSessionPointage.ts` |
| One open badge / user | `openPinSession` reuses `staff_pin_sessions` for `(establishment, pin_user)`; no second clock-in |
| Shared header tabs | `GET /api/auth/pin/sessions` (any auth) + FE merge; **one tab per PIN user**; focus remote → that user's PIN; carts local by `sid` |
| Tab sync | Poll ~12s while visible + window focus / online / manual refresh; drop local unlock after grace if closed remotely |
| Close badge | Header ✕ requires that user's PIN (any device); token proves ownership; managers may force-close from admin |
| Device focus | Shared tab *list*; which tab is **focused** stays per-device (`sessionStorage`) |
| Pointage network | **First** PIN open + any PIN close require venue Wi‑Fi allowlist; unlock/reuse + POS work off-network (5G/terrasse) |
| Specific rights | Always step-up PIN (`ensurePermission` / `ensureAccess`); no silent short-circuit on focused badge |
| Enforcement | `middleware/pinActor.ts` + `pinSessionGuard.ts` — `x-pin-actor-token` |
| Frontend | `PinSessionsContext.tsx`, header PIN tabs, PIN-first shell |

Every sale needs a PIN session (no comptoir-without-PIN). Daily Z does not auto-close badges.

Venue switch: `owner_pin` of the **login account’s** membership on the **target** venue.

## Dual traceability

Every traced write should carry both identities via `resolveActor(req)` /
`actorTrace` (`services/auth/actorContext.ts`) and prefer `logActorAction` for audit.

| Sink | Account | PIN user | PIN session |
|------|---------|----------|-------------|
| `orders` | `account_user_id` | `waiter_user_id` | `pin_session_id` |
| `audit_trail` | `user_id` | `pin_user_id` | `session_id` |
| `legal_journal` | `user_id` | `transaction_data.actor` | (same block; **outside hash**) |

## Permission tiers

Source of truth: `PERMISSION_TIERS` in `@mosehxl/types`.

- **Basic** — implicit for every active membership; 2-digit PIN OK; never a checkbox.
- **Specific** — grantable checkbox; 4–8 digit PIN; feature stays visible and asks for PIN
  (`ensurePermission` / `ensureAccess`) when the acting badge lacks the right.

`establishment_admin` holds every permission implicitly (on the **PIN** identity).

## Account lifecycle

- Staff create = PIN-only (`createPinOnlyStaff`).
- Default remove = **deactivate** — not hard delete.
- Hard purge only when footprint is empty.
- UI: `UserManagement/*` — « Équipe (PIN) » add dialog.

## Multi-tenancy (defense in depth)

1. JWT claim `establishment_id`
2. `getEstablishmentId(req, res)` — 403 if null
3. `runWithTenantContext` in `requireAuth` → AsyncLocalStorage
4. `pool.query` wrapper sets `SET LOCAL app.establishment_id`
5. PostgreSQL RLS policies on tenant tables
6. Explicit `establishment_id` in every model method

## Hard rules

1. Every establishment-scoped route calls `getEstablishmentId()` and passes it to models.
2. Backend authorization is mandatory — frontend gates are UX only.
3. Feature permissions require an active PIN actor (not JWT alone).
4. PIN actor token must match JWT `establishment_id`.
5. Permission keys from `@mosehxl/types` only — no ad-hoc strings.
6. Never put actor fields into the legal-journal **hash** payload.
7. Do not emit or rely on JWT `is_admin` — use `role`.
8. New code: one file per concern — see `code-hygiene` (400-line cap).

## Docs

- Plan: `docs/patch-notes/536-VENUE-LOGIN-PIN-ONLY-ACTORS-PLAN.md`
- Slices: 537–541
- `docs/runbooks/MULTI-ESTABLISHMENT-MEMBERSHIPS.md`
