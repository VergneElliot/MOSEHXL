---
name: auth-and-multi-tenancy
description: >-
  JWT auth, refresh rotation, CSRF, PIN sessions, permissions, and PostgreSQL
  RLS tenant isolation for MOSEHXL/MuseBar. Use when modifying auth routes,
  middleware, PIN actor tokens, user permissions, establishment switching,
  requireAuth, or any establishment_id scoping.
---

# Auth and Multi-Tenancy

Two session layers: **account JWT** (email/password login) and **PIN actor JWT** (on-floor staff identity).

## Account authentication

| Concern | Location |
|---------|----------|
| Routes | `backend/src/routes/authSession.ts`, `authLogin/*`, `authPin.ts` |
| JWT sign/verify | `backend/src/security/jwtConfig.ts` |
| Middleware | `backend/src/middleware/auth.ts` |
| Refresh + CSRF | `backend/src/routes/authLogin/sessionRoutes.ts`, `cookies.ts` |
| Frontend | `MuseBar/src/hooks/useAuth.tsx`, `services/api/core.ts` |

### Token storage (frontend)

- Access JWT: **in memory** via `ApiService.setToken()` — not localStorage
- Refresh: httpOnly cookie `musebar_refresh_token`
- CSRF: cookie `musebar_csrf_token` + header `x-csrf-token` on refresh

## PIN sessions (badges)

| Layer | Location |
|-------|----------|
| Verify PIN | `POST /api/auth/pin/verify` → opens `staff_pin_sessions` + returns token with `sid` |
| Actor token | `pinActorToken.ts` (`token_use: 'pin_actor'`, **12h** hard cap) |
| Server record | `models/staffPinSession.ts` — idle **60 min**, closed at daily closure |
| Enforcement | `middleware/pinActor.ts` + `pinSessionGuard.ts` — `x-pin-actor-token` |
| Frontend | `PinSessionsContext.tsx`, `pinElevation.ts`, `StepUpAuthContext.tsx` |

Lifetime: **12h OR 60 min idle OR daily closure** — whichever comes first.

`requirePermission` accepts the **account or the PIN identity** on the request (step-up).
`requirePinActor` is strict and checks the session row is still active.

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

When the user names a feature as a **specific permission**, implement all three: registry key +
tier `specific`, step-up UX, and Gestion des utilisateurs checkbox. Anything not named specific
is basic.

`establishment_admin` holds every permission implicitly.

## Account lifecycle

- Default remove = **deactivate** (`deactivateStaffAccount`) — not hard delete.
- Hard purge only when footprint is empty (`purgeStaffAccount` / `DELETE .../purge`).
- UI: `UserManagement/UserRowActions.tsx` + `ActivePinSessionsPanel.tsx`.

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
3. PIN actor token must match JWT `establishment_id`.
4. Permission keys from `@mosehxl/types` only — no ad-hoc strings.
5. Never put actor fields into the legal-journal **hash** payload.
6. Do not emit or rely on JWT `is_admin` — use `role`.
7. New code: one file per concern — see `code-hygiene` (400-line cap).

## Docs

- Foundation: `docs/patch-notes/486-IDENTITY-SESSIONS-PERMISSIONS-FOUNDATION-PLAN.md`
- Slices: 487–491
- `docs/course/06-AUTH-AND-SECURITY.md` (partially stale on token storage)
- `docs/runbooks/MULTI-ESTABLISHMENT-MEMBERSHIPS.md`
