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

### Refresh flow

1. Cookie-only refresh token
2. CSRF double-submit validation
3. `pg_advisory_xact_lock(user_id)` — serialize concurrent refreshes
4. Rotate refresh token + CSRF cookie
5. On reuse: revoke entire token family

## PIN sessions

| Layer | Location |
|-------|----------|
| Verify PIN | `POST /api/auth/pin/verify` → `authPin.ts` |
| Actor token | `backend/src/services/auth/pinActorToken.ts` (`token_use: 'pin_actor'`, 8h) |
| Enforcement | `backend/src/middleware/pinActor.ts` — header `x-pin-actor-token` |
| Frontend state | `MuseBar/src/contexts/PinSessionsContext.tsx` (sessionStorage) |
| Step-up | `MuseBar/src/contexts/StepUpAuthContext.tsx` |

PIN rules (shared via `@mosehxl/types`):

- Basic staff: 2-digit PIN
- Elevated (admin or elevated permissions): 4–8 digits

Order creation requires active PIN session (`usePOSAPI`).

## Roles and permissions

Runtime roles: `system_admin`, `establishment_admin`, `staff`

Permissions: `MuseBar/packages/types/src/index.ts` → `PERMISSIONS` constant. Backend alias: `backend/src/permissions/registry.ts` (`P = PERMISSIONS`).

```typescript
// Never use raw permission strings
requirePermission(P.access_pos)
requirePinActor(P.pos_reassign_waiter)
requireEstablishmentAdminOrPermission(P.access_compliance)
```

Resolution: `UserModel.getUserPermissions(userId, establishmentId)` — venue-scoped via `user_permissions`.

Production default: `establishment_admin` uses `explicit_only` permissions (not implicit all).

## Multi-tenancy (defense in depth)

1. JWT claim `establishment_id`
2. `getEstablishmentId(req, res)` — 403 if null
3. `runWithTenantContext` in `requireAuth` → AsyncLocalStorage
4. `pool.query` wrapper sets `SET LOCAL app.establishment_id`
5. PostgreSQL RLS policies on tenant tables
6. Explicit `establishment_id` in every model method

Child rows (`order_items`, `sub_bills`) must inherit tenant from parent order via guarded INSERT.

## Support impersonation

`system_admin` only. `POST /api/auth/support/impersonation/start`:

- Requires `reason` (≥5 chars), TOTP when enforced
- Issues JWT with `support_impersonation` metadata
- Revokes prior bearer; audited as `SUPPORT_IMPERSONATION_STARTED`

## Protected route template

```typescript
router.post('/',
  requireAuth,
  requirePermission(P.access_pos),
  requirePinActor(),  // when POS mutation
  validateBody([{ field: 'amount', required: true }]),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    // ...
  })
);
```

## Hard rules

1. Every establishment-scoped route calls `getEstablishmentId()` and passes it to models.
2. Never query tenant data without RLS context on authenticated paths.
3. Backend authorization is mandatory — frontend gates are UX only.
4. PIN actor token must match JWT `establishment_id`.
5. Permission keys from `@mosehxl/types` only — no ad-hoc strings.
6. Refresh endpoint: cookie-only + CSRF — no refresh token in JSON body.
7. Do not emit or rely on JWT `is_admin` — use `role`.

## Docs

- `docs/course/06-AUTH-AND-SECURITY.md` (partially stale on token storage)
- `docs/course/10-MULTI-TENANT-AND-MUSE-POS-ACCESS.md`
- `docs/runbooks/JWT-RS256-CUTOVER-AND-ROTATION.md`
- `docs/runbooks/MULTI-ESTABLISHMENT-MEMBERSHIPS.md`
