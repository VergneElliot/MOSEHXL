# Security: Credential Rotation After Backup Leak (2026-09-02)

## What happened

Production database dumps and `.env` files were committed under `backups/` in the public GitHub repository. Git history has been rewritten with `git-filter-repo` to remove `backups/` from all commits and branches were force-pushed.

**Rotation is still required.** Anyone who cloned or forked before the purge may retain the old data.

## Required actions on production host

1. **PostgreSQL `postgres` user password**
   - Change password on the production database server.
   - Update `DB_PASSWORD` in the real production `.env` (not in git).
   - Restart the backend service (`pm2 restart musebar-backend` or equivalent).

2. **Application user accounts exposed in dump**
   - Reset passwords for all user accounts present in the leaked dump (bcrypt hashes were included).
   - Prefer forcing password reset on next login for establishment admins.

3. **JWT and archive secrets** (if dump or env could have contained them)
   - If `JWT_SECRET`, `ARCHIVE_SECRET_KEY`, or `SETUP_SECRET` were ever in committed files, rotate them.
   - Rotating `JWT_SECRET` invalidates all active sessions — plan a maintenance window.

4. **GitHub**
   - Consider contacting GitHub Support to purge cached views of old commits.
   - Audit forks of `VergneElliot/MOSEHXL` for copies of pre-purge history.

## Verification

```bash
# Confirm backups/ no longer in history
git log --all -- backups/   # should print nothing

# Confirm not tracked
git ls-files backups/       # should print nothing
```

## Local clones after history rewrite

All collaborators must **re-clone** or reset hard to the new remote SHAs. `git pull` will fail or produce conflicts after a force-push history rewrite.

```bash
git fetch origin
git reset --hard origin/development   # or your branch
```
