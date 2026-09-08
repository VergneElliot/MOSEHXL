# 486 — Identity, PIN sessions, permissions & dual traceability (PLAN)

Foundation document. Defines the target model for accounts, PIN sessions and permissions,
and the rule that **every traced action records both the account and the PIN session**.

## Context

Three layers grew independently and now contradict each other:

1. **Account JWT** (email/password) — the device/terminal holder.
2. **PIN actor JWT** (`x-pin-actor-token`, 8h, stateless) — the staff member performing the action.
3. **Permissions** — `user_permissions` grants, plus role bypasses, plus a duplicated
   `access_compliance` / `access_closure` key.

Consequences observed in production use:

- Multi-tab PIN sessions randomly lose a tab (see root causes below).
- Permission grants in the UI do not map to what routes actually enforce.
- Traceability is one-sided: fiscal writes record the **account**, floor writes sometimes
  record only the **PIN actor**. There is no way to answer *"which badge did this, on whose login?"*.

## Confirmed defects (root causes, not hypotheses)

### D1 — Multi-tab session clobber (the screenshot bug)

`MuseBar/src/contexts/PinSessionsContext.tsx` mutates state from a **captured snapshot**
instead of a functional updater: every action computes `sessions.map(...)` / `[...sessions, x]`
from the `sessions` value captured in its `useCallback` closure, then calls
`persist(next, active)` which does an absolute `setSessions(next)` + `sessionStorage` write.

`MuseBar/src/components/POS/POSContainer.tsx` (cart persist effect) and the floor hooks
(`useFloorService`, `useFloorPlanManagement`) call `updateActiveSession(...)` from async
handlers and effects. When one of those fires with a pre-add snapshot, the newly opened
session is **erased from state and sessionStorage**.

That is why it works when the cart is empty and breaks after floor/cart activity.

### D2 — The dead "Session : besservex" text

`PinSessionHeaderTabs.tsx` sets `info` = `Session : <name>` after a successful PIN verify and
renders it as a permanent `Typography` next to the tabs. It is never cleared, so after D1
eats the tab the leftover caption looks like an unclickable tab.

### D3 — Zombie session tabs

`PinActorState` stores no expiry. The PIN actor JWT lives 8h; tabs persist in `sessionStorage`
indefinitely. An expired tab stays clickable and every API call 401s with no re-prompt.

### D4 — PIN lockout is not enforced (security)

`MembershipPinModel.recordFailedAttempt()` exists but has **zero call sites**.
`POST /api/auth/pin/verify` returns `PIN_INVALID` without counting failures, so
`pin_locked_until` is never set and `isLocked()` can never be true.
Combined with **2-digit PINs for basic staff (100 combinations)** and no audit row on
successful verify, any staff identity on a logged-in terminal is trivially assumable.

### D5 — `access_compliance` is ungrantable

Migration `2026_04_22_12_00_00_granular_permissions.sql` renames the DB row
`access_compliance` → `access_closure`. Code still gates legal/journal routes on
`P.access_compliance`, and `MuseBar/src/types/auth.ts` `ALL_PERMISSIONS` omits it.
Net effect: no non-admin can ever hold compliance access, whatever the UI shows.

### D6 — Inconsistent gates and dead RBAC

- `requireEstablishmentAdminOrPermission` lets `establishment_admin` through regardless of
  `ESTABLISHMENT_ADMIN_PERMISSION_MODE`, while `requirePermission` respects `explicit_only`.
- `roles`, `user_role_assignments`, SQL `get_user_permissions()` / `user_has_permission()`
  exist in schema snapshots and are never used by `UserModel.getUserPermissions`.
- `GET /api/orders` (history) has no permission gate.
- `useUserActions.updateUserRole` and `PUT /auth/users/:id/unlock` have no UI.

## Target model

### Accounts

One account per staff member, never shared.

| Concern | Rule |
|---------|------|
| Identity | email (unique) |
| Secret | password, existing strength + breach rules |
| Global role | `system_admin` (no establishment) or none |
| Venue role | `user_establishment_memberships.role` ∈ `establishment_admin` \| `staff` |
| Grants | `user_permissions (user_id, permission_id, establishment_id)` |
| Badge | `user_establishment_memberships.pin_hash` (per venue) |

### Two identity layers, always complementary

| Layer | Question answered | Lifetime | Carrier |
|-------|-------------------|----------|---------|
| **Login session** (account JWT) | Who opened this terminal? | 12h access + rotating refresh | `Authorization: Bearer` |
| **PIN session** (actor) | Who is performing this action? | 8h, closable | `x-pin-actor-token` |

A PIN session replaces the physical key of legacy tills: one logged-in terminal, many staff
identities, no logout/login cycle.

### New: PIN sessions become server-side records

Today a PIN session is a stateless JWT — there is nothing to reference from a journal entry
and nothing to list or revoke. Introduce:

```sql
staff_pin_sessions (
  id UUID PRIMARY KEY,
  establishment_id UUID NOT NULL,
  pin_user_id INTEGER NOT NULL,              -- badge identity
  opened_by_account_user_id INTEGER NOT NULL,-- terminal login that opened it
  opened_at, last_seen_at, closed_at,
  close_reason VARCHAR(32),                  -- manual | expired | revoked | logout
  client_session_id TEXT,                    -- device fingerprint (existing cookie)
  device_label TEXT
)
```

The PIN actor JWT gains a `sid` claim = `staff_pin_sessions.id`. That id is what gets stamped
on traced rows, so "same badge, different shift/terminal" stays distinguishable.

### One actor resolver

There is currently **no** `getActor` / `resolveActor` helper — which is exactly why
traceability drifted per route. Add a single source of truth:

```ts
// backend/src/services/auth/actorContext.ts
type ActorContext = {
  establishment_id: string;
  account_user_id: number;          // always present on authenticated routes
  account_email: string;
  pin_user_id: number | null;       // present when a PIN session is used
  pin_session_id: string | null;
  pin_display_name: string | null;
  origin: 'account' | 'pin_session' | 'system';
};

resolveActor(req): ActorContext
```

Every traced write takes `ActorContext` instead of loose ids.

### Traceability contract

> Any action that is journaled, audited, or fiscally relevant records **account + PIN user + PIN session**.

| Sink | Account | PIN user | PIN session | Change needed |
|------|---------|----------|-------------|---------------|
| `legal_journal` | `user_id` (exists) | new column | new column + `transaction_data.actor` mirror | add nullable columns |
| `audit_trail` | `user_id` (exists) | `action_details.pin_user_id` | **`session_id`** (column exists, currently always null) | populate, no schema change |
| `orders` | new `cashier_account_user_id` | `waiter_user_id` (exists) | new `pin_session_id` | add columns |
| `open_tickets` | add account side | `opened_by_user_id` / `last_served_by_user_id` | add | add columns |
| `printing_jobs` | add account side | `created_by_user_id` (pin on floor, account on order) | add | normalize |
| `time_entries` | add terminal-holder account | `user_id` (target employee) | add when PIN-based | add columns |
| Closures, refunds, change, software events | account only today | required | required | thread `ActorContext` |

**Hash-chain safety (verified).** The `legal_journal` hash payload is
`sequence|type|order_id|amount|vat|payment|timestamp|register_id`, both in
`journalAppend.ts` and in the DB trigger. `user_id` and `transaction_data` are **outside** the
hash. Adding actor columns is therefore **non-ISCA**: no attestation impact, existing hashes
stay verifiable. Hard rule for implementation: **do not add actor fields to the hashed string.**

### Permissions

Registry in `@mosehxl/types` stays the single source of truth. Then:

1. **Reconcile DB ↔ registry** in a migration: seed every registry key as a `permissions` row,
   restore `access_compliance`, report orphans.
2. **Settle the compliance/closure split** — keep both, distinct meanings:
   `access_closure` = create/read closure bulletins; `access_compliance` = legal journal,
   ISCA reports, integrity verification. Add both to the UI grant list.
3. **One consistent gate semantic** — pick either "admin always passes" or "explicit grants
   only" and apply it to `requirePermission` *and*
   `requireEstablishmentAdminOrPermission`.
4. **Role presets** (Gérant, Manager, Serveur/Barman, Caisse) that expand into grants —
   templates in the UI, still stored as `user_permissions` rows. No new RBAC tables.
5. **Delete or document** the dead `roles` / `user_role_assignments` / SQL helper functions.
6. **Close gate gaps** — e.g. `GET /api/orders` history.

### Permission checks: which identity decides?

Current behaviour is mixed (line-item POS permissions check the **account**, floor routes check
the **PIN actor**). Target rule:

- If an action is performed under a PIN session, the **PIN actor's** permissions authorize it.
- The account must independently hold `access_pos` to have opened the terminal at all.
- Elevation (Offert, Perso, manual HH, cancel, intervene) is a **PIN-actor** decision, so the
  responsible person is the one recorded.

## Slices

| Slice | Content | Risk |
|-------|---------|------|
| **A** | Fix D1/D2/D3: functional state updates, transient toast, `expiresAt` + expiry UX | low, no schema |
| **B** | `staff_pin_sessions` + `sid` claim + `ActorContext` + dual traceability on POS/journal/audit | medium, schema + fiscal paths (non-hash) |
| **C** | Permission reconciliation, compliance/closure split, gate consistency | medium, can lock people out — needs care |
| **D** | User management UI rebuild: roles, grouped grants + presets, PIN, active sessions, unlock, deactivate | low |
| **E** | PIN hardening: enforce lockout, audit verify, decide PIN length policy | low code, policy decision |

## Decisions taken

1. **PIN length — tiered.** Staff holding only basic permissions keep a **2-digit** PIN; staff
   holding any specific permission use **4–8 digits**. PIN verify is throttled and audited
   (identity-less pad → per-terminal rate limit, not per-user lockout). Tiers live in
   `PERMISSION_TIERS` (`@mosehxl/types`).
2. **Gate semantics — implicit admin.** `establishment_admin` holds every permission implicitly.
3. **PIN session lifetime — three limits, whichever comes first:** hard cap **12 h**, idle
   timeout **60 min** without a request, and **all badges closed at daily closure**.
4. **Account removal — deactivate by default.** « Supprimer » deactivates (membership off, PIN
   cleared, badges closed, refresh revoked) so past sales stay attributable. Hard purge exists
   for accounts with **no** footprint (orders / journal / audit / time entries), via
   `DELETE /api/auth/users/:id/purge`.

## Still open

None for this foundation. Per-feature “what is specific” continues page by page; anything not
named specific is basic.

## Verification

- [ ] Open 4 PIN sessions with active carts and floor tickets; no tab is lost, switching preserves cart
- [ ] Expired PIN session shows as expired and re-prompts instead of 401
- [ ] Wrong PIN increments failures and locks out; both outcomes audited
- [ ] Order created on account A with badge B: journal, audit and order rows all carry A, B and the session id
- [ ] Journal integrity verification still passes over pre-change and post-change entries
- [ ] Permission grant in UI produces the matching API access, for every registry key
- [ ] Fiscal impact: **PATCH/MINOR** (no ISCA parameter change; hash payload untouched)

## Risks

- Slice C can revoke access for real users → ship with a dry-run report of resolved
  permissions per user before/after.
- Slice B touches order creation, which aborts if journal writes fail → keep new columns
  nullable and never let actor enrichment throw.
- `sessionStorage` migration for existing open tabs must not crash on the old shape.
