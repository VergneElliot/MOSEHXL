# Multi-establishment memberships

## Model

- One `users` row with `can_login = true` is the **venue login** (email UNIQUE, password).
  Staff are separate PIN-only actors (`can_login = false`, one establishment).
- Access to venues is via `user_establishment_memberships` (`role` = `establishment_admin` | `staff`).
- **Feature permissions come only from an active PIN session**, not from the account JWT.
- JWT shape: `{ id, email, role, establishment_id }` for the **active** membership (shell only).
- `users.establishment_id` / `users.role` are a last-active cache updated on login and switch.

## Migration notes (`2026_07_30_16_00_00_user_establishment_memberships.sql`)

1. Seeds memberships from existing `users.establishment_id`.
2. Backfills `user_permissions.establishment_id`, then makes it NOT NULL.
3. **Merges duplicate emails** into a canonical user (prefer `system_admin`, then recent `last_login`, then highest `id`):
   - Moves memberships and permissions onto the canonical row.
   - Remaps / drops `auth_refresh_tokens` and planning ICS tokens for loser rows (skipped when those tables are absent).
   - Deletes loser `users` rows (audit trail may keep historical user ids as text — no FK rewrite).
4. Enforces `UNIQUE (LOWER(email))`.

Later: `users.can_login` + backfill marks PIN staff (`2026_09_30_*_users_can_login` /
`pin_staff_can_login_backfill`).

### Edge cases after merge

| Topic | Behavior |
| --- | --- |
| MFA / TOTP | Canonical row keeps its own MFA secret. Loser MFA secrets are discarded with the deleted row. Users who only had MFA on a loser account must re-enrol. |
| Refresh sessions | Loser refresh tokens are remapped or deleted; clients may need to log in again. |
| Password | Canonical password wins. If venues had different passwords for the same email, only the canonical hash remains — reset via unlock / password change if needed. |
| Role conflict | Same email + same establishment: membership `ON CONFLICT` prefers the incoming role from the loser insert path; prefer reviewing admins after migrate. |

## API

- Login and `GET /auth/me` return `memberships: [{ establishment_id, name, role }]`.
- `POST /auth/switch-establishment` `{ establishment_id, owner_pin }` verifies the login
  account’s PIN on the **target** venue, then re-issues the access token.
- Staff create: `POST /auth/pin-staff` (name + PIN). No email invite for PIN staff.

## Frontend

Header name opens a venue menu when `memberships.length > 1` (hidden for `system_admin`).
Switch prompts for owner PIN, then refreshes token and reloads catalog / happy-hour data.
PIN-first shell: no feature tabs until a badge is open.
