# Admin 2FA enrollment + enforcement (COMP-2)

Status: Blocked on human TOTP enrollment — do **not** flip the env flag first  
Related: `AUTH_ENFORCE_ADMIN_2FA` in production `.env`

## Why

Admin accounts can change users, settings, and fiscal-adjacent operations.
Password-only admin is the usual breach path. Enforcement is already implemented;
it is off because **no** production user had TOTP enrolled (enabling it would
lock everyone out).

## Steps

### A — Enroll (every privileged user)

1. Log into https://mosehxl.com with each admin / establishment_admin who needs
   elevated access.
2. Open the security / MFA settings in the app (TOTP setup UI).
3. Scan the QR with Aegis / Google Authenticator / 1Password.
4. Confirm login still works with password + TOTP.
5. On the server (read-only check):

```bash
set -a; . /var/www/MOSEHXL/MuseBar/backend/.env; set +a
export PGPASSWORD="$DB_PASSWORD"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -c "SELECT id, email, mfa_totp_enabled FROM users ORDER BY id;"
```

All users who must retain access should show `mfa_totp_enabled = t`.

### B — Enforce

```bash
# On production host
sed -i 's/^AUTH_ENFORCE_ADMIN_2FA=.*/AUTH_ENFORCE_ADMIN_2FA=true/' \
  /var/www/MOSEHXL/MuseBar/backend/.env
# If the key is missing, append it:
grep -q '^AUTH_ENFORCE_ADMIN_2FA=' /var/www/MOSEHXL/MuseBar/backend/.env \
  || echo 'AUTH_ENFORCE_ADMIN_2FA=true' >> /var/www/MOSEHXL/MuseBar/backend/.env
pm2 restart mosehxl-backend --update-env
```

3. Test login (password alone must fail / challenge; TOTP succeeds).
4. Update `PRODUCTION-CONFIG-SNAPSHOT.md` and mark COMP-2 done.

### Break-glass

Keep `/root/.mosehxl-doadmin.env` for DB emergencies. Document who holds
recovery codes. Do not disable 2FA in production without a dated incident note.

## Agent note

Agent must not set `AUTH_ENFORCE_ADMIN_2FA=true` until step A is confirmed for
all required accounts.
