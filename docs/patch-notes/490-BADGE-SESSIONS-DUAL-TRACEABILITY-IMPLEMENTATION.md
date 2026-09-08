# 490 — Badge sessions and dual traceability (IMPLEMENTATION)

Slice B of [486](486-IDENTITY-SESSIONS-PERMISSIONS-FOUNDATION-PLAN.md), plus the module-size
guardrail requested alongside it.

Every traced action now names **both** identities: the account the terminal is logged into, and
the PIN identity (badge) that performed it — with the specific badge-in it belongs to, not just
the user.

## Badge sessions

Migration `2026_09_03_22_10_00_staff_pin_sessions.sql`:

- `staff_pin_sessions` — `user_id` (PIN identity), `opened_by_user_id` (account), `opened_at`,
  `last_seen_at`, `expires_at`, `closed_at`, `close_reason`, IP and user agent. Tenant-scoped
  with the standard RLS pair.
- `orders.account_user_id` and `orders.pin_session_id` next to the existing waiter snapshot.
- `audit_trail.pin_user_id`; the pre-existing, unused `session_id` column now carries the badge
  session id.

`POST /api/auth/pin/verify` opens a session row and puts its id in the PIN actor token as the
`sid` claim, alongside `opened_by_user_id`. Opening the row is best-effort: if it fails the
badge still works, attributed to the user without a session id.

New routes under `/api/auth/pin/sessions`:

| Route | Gate |
|-------|------|
| `GET /` | `access_user_management` — active badges in the establishment |
| `POST /:sessionId/close` | own badge always; someone else's needs `access_user_management` |

## Revocation

`requirePinActor` resolves the session behind the token and rejects with `PIN_SESSION_CLOSED`
when it is closed or expired, so closing a badge takes effect immediately instead of at the
token expiry. Tokens without `sid` (issued before this change) and lookup failures resolve to
`unknown` and are allowed — a database hiccup must not stop service. `last_seen_at` is
refreshed at most once per five minutes per session.

Badges are closed automatically when their credentials or scope change: `POST /auth/pin/set`
(`pin_changed`), `DELETE /auth/pin/:userId` (`pin_cleared`), and any grant change that alters
the effective permission set (`permissions_changed`) — the token embeds a permission snapshot,
so a live badge would otherwise keep the old rights.

## One place that answers "who did this"

`services/auth/actorContext.ts`: `resolveActor(req)` returns
`{ accountUserId, accountEmail, pinUserId, pinDisplayName, pinSessionId, establishmentId }`,
and `actorTrace` renders it flat for JSONB columns. `services/audit/auditActorLog.ts` wraps the
audit write so a route handler cannot forget half the identity.

Wired into order creation: the order row carries `account_user_id` + `pin_session_id`, the
`ORDER_CREATED` audit row carries `pin_user_id` + `session_id`, and the SALE journal entry
carries an `actor` block inside `transaction_data`.

**Fiscal note.** The journal hash covers
`sequence_number|transaction_type|order_id|amount|vat_amount|payment_method|timestamp|register_id`
only. `transaction_data` is outside the hashed payload, so recording the actor there cannot
alter the chain, and existing entries verify unchanged. No journal row is modified.

## Gestion des utilisateurs

New « Sessions PIN actives » panel: badge, account it was opened from, opened / last activity /
expiry, and a **Fermer** action. `PermissionsDialog` moved out of `UserManagement.tsx` into its
own component in the same pass.

## Module size guardrail

`scripts/check-module-size.mjs` enforces a 400-line cap on `.ts`/`.tsx` sources, ratcheted
against `scripts/module-size-baseline.json`:

- a new file over the cap fails;
- a file already in the baseline (40 of them today) fails **as soon as it grows**;
- `--update` refuses to raise any existing allowance, so the baseline can only tighten.

Runs in `.husky/pre-commit` on staged files and in CI (`frontend-test` job) on everything.
Rules live in `AGENTS.md` (always in context) with the detail in
`.cursor/skills/code-hygiene/SKILL.md`.

It caught two violations while this slice was being written — the PIN calls added to
`services/api/floor.ts` and the panel added to `UserManagement.tsx` — both fixed by extraction
(`services/api/pin.ts`, `UserManagement/PermissionsDialog.tsx`) rather than by raising a limit.

## Verification

- backend `type-check`, `lint`, `check:schema-drift`: clean
- backend tests: 414 passed, 13 failed — same 13 as the pre-change baseline (`floor.routes`,
  `timeEntry.ip`, `settings.softwareEvents`, the two `journalFailSafe` suites, `authLogin`
  2FA/session-kick, `authRegister.roleGrantGuard`, `legalArchiveClosure.permissions`,
  `orderCRUD.establishmentIsolation`)
- frontend `type-check`, `lint`, tests: clean, 59 passed
- migration applied locally; `migration:status` clean

New tests: `services/auth/pinSessionGuard.test.ts`, `services/auth/actorContext.test.ts`,
session-closure cases in `permissionGrantService.test.ts`, `sid` cases in
`contexts/pinSessionsState.test.ts`.

## Known limits

- `readOptionalPinActor`, used by step-up permission gates, stays synchronous and does not check
  the session row — a step-up token from a closed badge remains usable until it expires. Strict
  gates (`requirePinActor`, all POS mutations) do check.
- Role presets (Gérant / Manager / Serveur templates) are not built yet; grants remain
  checkbox-by-checkbox. Dead `roles` / `user_role_assignments` tables are unused and may be
  dropped in a later hygiene pass.

## Follow-up

Cancellation / tip-reversal / change-cancel journal and audit rows now also carry
`transaction_data.actor` / audit PIN fields — see [492](492-CANCEL-ACTOR-DUAL-TRACE-IMPLEMENTATION.md).
