# 489 — Basic vs specific permissions, and PIN policy (IMPLEMENTATION)

Implements [488](488-PERMISSION-TIERS-PIN-POLICY-PLAN.md).

## Tier table as single source of truth

`MuseBar/packages/types/src/permissions.ts` now carries `PERMISSION_TIERS`, an exhaustive
`Record<PermissionName, 'basic' | 'specific'>`, with `BASIC_PERMISSIONS`,
`SPECIFIC_PERMISSIONS`, `isBasicPermission` and `isSpecificPermission` derived from it. Adding a
permission key without classifying it is a compile error.

`ELEVATED_PIN_PERMISSIONS` in `pinRules.ts` is now `SPECIFIC_PERMISSIONS` instead of a
hand-kept list, so a new specific permission can never silently remain reachable with a
2-digit PIN.

Basic today is exactly `access_pos`, which is what the existing routes already use for Caisse,
floor-plan read and catalog read. History browsing and `PATCH /auth/me/profile` are ungated
beyond authentication, so they need no key.

## Resolution

`MuseBar/backend/src/permissions/resolve.ts` (new, pure):

- `resolveEffectivePermissions` — `establishment_admin` gets every registry key; any active
  membership gets the basic tier implicitly; specific permissions come from `user_permissions`;
  grants no longer in the registry are ignored
- `requiresPinResetAfterGrantChange` — true only when a change flips an account from
  basic-PIN to elevated-PIN while it already has a PIN

`UserModel.getUserPermissions` delegates to it. The `ESTABLISHMENT_ADMIN_PERMISSION_MODE`
branch is gone: admins are implicit everywhere, per the decision in 486. Admin resolution no
longer reads `SELECT name FROM permissions`, so a missing DB row cannot shrink admin rights.

## Grant writes keep PIN strength consistent

`MuseBar/backend/src/services/auth/permissionGrantService.ts` (new) backs both
`POST` and `PUT /api/auth/users/:id/permissions`:

- stores **specific keys only** — basic keys are dropped, since storing them would make a
  missing row look like a downgrade — and ignores unknown keys
- compares effective permissions before and after; if the account just gained its first
  specific permission and holds a 2-digit PIN, that PIN is **cleared** and must be set again
- returns `pin_cleared`, which is echoed in the API response, the audit entry and the
  `USER_PERMISSIONS_UPDATED` software event

## PIN verify hardening

`MuseBar/backend/src/routes/authPin.ts`:

- `POST /verify` is throttled with the existing `createAuthRateLimitMiddleware`, keyed on
  IP + logged-in account, 30 attempts per 10 minutes (200 in development)
- every failure emits a `MEDIUM` security log and a `pin_verify_failed` audit entry
- every success emits a `pin_verify_success` audit entry recording **both** identities:
  `account_user_id` and `pin_user_id`

Why not per-user lockout: verify is identity-less, so a wrong PIN matches no membership and
there is no counter to increment. `MembershipPinModel.recordFailedAttempt` stays unused on this
path by design; the `isLocked` / `clearLockout` checks on a matched membership are unchanged.

## Registry reconciliation

`2026_09_03_21_25_00_reconcile_permission_registry.sql` inserts every registry key
(`ON CONFLICT DO NOTHING`), which restores **`access_compliance`** — ungrantable since
`2026_04_22_12_00_00_granular_permissions` renamed its row to `access_closure` while the code
kept gating the legal journal on it. It also deletes `access_pos` grant rows, now implicit.

## Step-up: authorizing from the PIN identity

**Backend.** `readOptionalPinActor` (`middleware/pinActor.ts`) validates `x-pin-actor-token`
without failing the request. `requirePermission` and `requireAnyPermission` now pass when
**either** the logged-in account **or** that PIN identity holds the permission, and set
`req.pinActor` to whoever authorized the call. Because every specific route already used these
gates, the whole surface accepts step-up with no route-by-route sweep. `requirePinActor` keeps
its strict semantics for POS routes that must be attributed to a badge.

**Which token is sent.** `MuseBar/src/services/pinElevation.ts` (new) resolves one identity per
request, in priority order:

1. **transient** — the PIN typed into a step-up prompt, consumed by the first request that
   reads it, so a single click cannot authorize a later one
2. **scope** — the PIN that opened a gated page, until the page is left
3. **session** — the badge selected in the header

`services/api/core.ts` attaches the result as `x-pin-actor-token` on every request unless the
caller passed one explicitly, which also gives the account plus PIN pair on ordinary calls.

**Step-up context.** `StepUpAuthContext` drops the old `grantByPermission` cache (it made an
authorization last for the whole session) and exposes:

- `ensurePermission(permission | permissions[])` — single action, always prompts unless the
  active session holds the right
- `ensureAccess(...)` — same prompt, opens a scope for a page
- `hasAccess`, `releaseAccess`, `releaseAllAccess`

Both accept a list, so Administration can be entered with any one of its permissions. Switching
badge clears every scope and any pending transient token.

## Nothing is hidden any more

- `AppRouter` — all six tabs are shown to every member. `TAB_ENTRY_PERMISSIONS` gates Clôtures
  and Administration on entry; Caisse, Plan de salle, Historique and Paramètres are basic.
  Leaving a gated tab releases its scope. `posLinePermissions` is gone: line actions are no
  longer decided from the account's permission list.
- `POSContainer` — Happy Hour manuel, Offert, Perso, Remise and waiter reassignment are always
  offered; the existing `ensurePermission` calls turn a click into a PIN prompt.
- `SettingsTabs` — Profil opens for everyone, every other tab asks for `access_settings`
  (`access_menu` for Menu), and the Menu tab is no longer hidden. `canManageMenu` is removed.
- `AdministrationContainer` — all nine sections are listed and gated per section on entry.
  Pointage stays basic. **Conformité Légale and Journal de sécurité move from admin-only to
  `access_compliance`**, which admins hold implicitly, so they can now be delegated.
- `HistoryContainer` — cancellation controls are always rendered and gated by the existing
  `orders_cancel` prompt.

## Frontend

`MuseBar/src/types/auth.ts`: `ALL_PERMISSIONS` is derived from `SPECIFIC_PERMISSIONS` with an
exhaustive French label/group record, so `access_pos` no longer appears as a checkbox and
`access_compliance` finally does. Added `PERMISSION_GROUP_ORDER` and
`BASIC_PERMISSION_SUMMARY`.

`UserManagement.tsx`: the permission dialog groups checkboxes by Caisse / Historique /
Paramètres / Clôtures / Administration, and states which rights are basic and that a specific
grant forces a 4–8 digit PIN.

## Verification

- `src/middleware/auth.pinActorPermission.test.ts` — 6 tests: account holds it, PIN identity
  holds it (and is exposed on the request), neither holds it, PIN from another establishment,
  invalid or expired token, no token at all
- `src/services/pinElevation.test.ts` (frontend) — 9 tests: session fallback, one-shot
  consumption, expiry, scope persistence, transient over scope, latest scope wins
- `src/permissions/resolve.test.ts` — 15 tests: tier partition covers the registry exactly,
  elevated PIN set equals the specific tier, resolution for staff/admin/no-context, stale
  grants ignored, PIN reset only on basic → elevated
- `src/services/auth/permissionGrantService.test.ts` — 6 tests: basic and unknown keys dropped,
  dedup, PIN cleared on first specific grant, PIN kept when already elevated, on revocation,
  and when no PIN exists
- `src/models/user.permissionResolution.test.ts` — replaces `user.permissionMode.test.ts`,
  which asserted the removed `explicit_only` mode
- `authRegister.softwareEvents.test.ts` updated for the new grant path and `pin_cleared`
- Backend suite: remaining failures are exactly the pre-existing set (verified against a
  baseline run with these changes stashed): `floor.routes`, `settings.softwareEvents`,
  `timeEntry.ip`, `authLogin.admin2fa`, `authLogin.loginSessionKick`, the two
  `journalFailSafe` files, `orderCRUD.establishmentIsolation`,
  `authRegister.roleGrantGuard`, `legalArchiveClosure.permissions`
- Frontend suite 57/57, type-check clean, backend lint clean (4 pre-existing warnings)
- Migration applied: 63 total, 0 pending

## Fiscal impact

**PATCH** — no ISCA parameter change. The legal journal, closures and archives are untouched;
only who may reach the compliance routes changes, and it becomes grantable as intended.

## Known limits

- The transient token is consumed by the *first* request issued after the prompt. A background
  poll firing in that same instant would carry it instead of the intended call. Step-up is a
  modal, user-initiated flow, so the window is a few milliseconds, but a request-scoped
  identity would remove the risk entirely.
- A gated page's scope is keyed by permission, not by page, so two pages sharing a permission
  share the scope.

## Migration note

Existing staff with an explicit `access_pos` grant lose the row but keep the access, since it
is now implicit. Any account holding a specific permission with a 2-digit PIN keeps that PIN
until its grants are next edited — the reset only triggers on a change. Re-saving their
permissions clears it and forces a compliant one.
