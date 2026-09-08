# Unlock login + soft auth (Muse ops)

For the internal Muse deployment, harsh lockouts and HIBP password blocking are more pain than
protection. Soft defaults ship in code; production still needs a one-time unlock for accounts
already locked, and `PASSWORD_BREACH_CHECK_ENABLED=false` on the server.

## Unlock a locked account (e.g. Leo)

On the app server (or any host with prod DB credentials):

```sql
UPDATE users
SET
  failed_login_attempts = 0,
  lockout_count = 0,
  locked_until = NULL,
  is_active = TRUE
WHERE lower(email) = lower('leobappel@gmail.com');
```

Also ensure membership is active:

```sql
UPDATE user_establishment_memberships m
SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP
FROM users u
WHERE m.user_id = u.id
  AND lower(u.email) = lower('leobappel@gmail.com');
```

Or from the app (after this release): **Gestion des utilisateurs → Déverrouiller**.

## Disable Have I Been Pwned password blocking

In `MuseBar/backend/.env` on the cloud host:

```bash
PASSWORD_BREACH_CHECK_ENABLED=false
```

Then `pm2 restart musebar-backend --update-env` (or your usual restart).

Without this, password change / invitation / create-user reject passwords that appear in public
breach corpora — common for real-world passwords.

## Soft lockout defaults (code)

| Setting | Old default | New default |
|---------|-------------|-------------|
| Failures before lock | 5 | 8 |
| First lock duration | 15 min | 2 min |
| Max lock duration | 240 min | 15 min |
| Login rate limit (prod) | 10 / 15 min | 30 / 15 min |

Override anytime with `AUTH_LOCKOUT_*` env vars.

## Public reservation link

Guest URL: `https://mosehxl.com/reserve/<slug>` (Muse slug is typically `musebar`).

API (no auth): `GET/POST /api/public/reservations/:slug`.

After deploy, confirm in a private/incognito window (no staff cookie).

## Site vitrine (later)

Add the same `/reserve/musebar` link on the marketing site when that surface is ready — not part
of this ops patch.
