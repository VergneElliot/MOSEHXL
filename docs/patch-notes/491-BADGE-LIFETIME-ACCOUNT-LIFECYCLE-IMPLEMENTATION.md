# 491 — Badge lifetime and account lifecycle (IMPLEMENTATION)

Slice D of [486](486-IDENTITY-SESSIONS-PERMISSIONS-FOUNDATION-PLAN.md): the two decisions left
open by [490](490-BADGE-SESSIONS-DUAL-TRACEABILITY-IMPLEMENTATION.md) — how long a badge stays
open, and what "delete a user" means when that user's past sales must stay attributable.

## Badge lifetime

Three independent limits, whichever comes first:

| Limit | Value | Where |
|-------|-------|-------|
| Hard cap | 12 h | `PIN_ACTOR_EXPIRES_IN` / `PIN_ACTOR_TTL_MS`, also the token `exp` |
| Idle timeout | 60 min without a request | `PIN_SESSION_IDLE_TIMEOUT_MS` |
| Daily closure | all badges of the establishment | `closeBadgesAfterDailyClosure` |

The idle timeout is enforced at read time: `findActive` and `listActive` both require
`last_seen_at` inside the window, so an idle badge stops authorising immediately even before its
row is marked closed. `closeStale` then writes the terminal state — `expired` or `idle_timeout` —
and runs lazily on `GET /api/auth/pin/sessions`, which keeps the panel honest without a cron.

A daily closure ends the service day, so no badge survives it. Closure is fail-closed on its
journal entry but **not** on this: if closing badges fails, the failure is logged and the closure
still succeeds. The closure logic moved out of the route into
`services/legal/closureCreationService.ts` in the same pass, which also brought `closure.ts` back
under the module cap.

## Account lifecycle

`DELETE /api/auth/users/:id` no longer deletes. It **deactivates**:

- membership `is_active = false` — no login, no badge-in;
- PIN cleared;
- open badges closed (`account_deactivated`);
- refresh tokens revoked, so an open terminal loses the session on next rotation.

The `users` row and every order, journal entry, audit row and time entry keep pointing at a real
identity. Audit action type `DEACTIVATE_USER`; the software event stays
`ESTABLISHMENT_USER_DELETED` with `deactivated: true` so the fiscal event vocabulary is unchanged.

Hard deletion still exists for the honest mistake — a mistyped invitation, a duplicate account —
and lives in `routes/staffAccounts.ts`, mounted on `/api/auth/users` and gated on
`access_user_management`:

| Route | Behaviour |
|-------|-----------|
| `GET /` | members including deactivated ones, each with `is_active` |
| `GET /:id/footprint` | orders / journal / audit / time-entry counts + `purgeable` |
| `POST /:id/reactivate` | membership back to `is_active = true` |
| `DELETE /:id/purge` | hard delete, **409 with the counts** if the footprint is non-empty |

`purgeStaffAccount` re-reads the footprint inside the request rather than trusting a number the
client saw earlier, and drops the `users` row only when no membership in any establishment remains.

Service-facing lists (planning, time clock, payroll, waiter pickers) keep using the active-only
`UserModel.listUsersByEstablishment`, so a deactivated member disappears from the floor while
staying visible — and reactivatable — in Gestion des utilisateurs.

## Gestion des utilisateurs

Row actions moved into `UserManagement/UserRowActions.tsx` and now depend on state: an active
member shows Permissions / Définir–Changer PIN / Effacer PIN / **Désactiver**; a deactivated one
shows **Réactiver** and **Supprimer définitivement**, greyed with a « Désactivé » chip. A refused
purge surfaces the backend message with its activity counts, so the reason is the data itself
rather than a generic error.

## Verification

- backend `type-check`, `lint` (0 errors), module-size check: clean
- backend tests: 414 passed, 13 failed — the same 13 pre-existing failures as HEAD, confirmed by
  running the suite in a clean worktree at HEAD (16 failures there; every failure on this branch
  is a subset)
- frontend `type-check`, `lint` (0 errors), tests: clean, 59 passed
