# Phase 4 ops — closure addendum (2026-07-16 evening)

Closes the open items that blocked “signature-ready” after the initial Phase 4 pass.

## Least-privilege DB roles

| Role | Purpose | Attributes |
|------|---------|------------|
| `mosehxl_app` | Application runtime (`DB_USER`) | LOGIN; **no** Bypass RLS; no CreateDB/CreateRole |
| `mosehxl_backup` | `pg_dump` via `DB_BACKUP_USER` | LOGIN; SELECT-only; **BYPASSRLS** so COPY sees all tenant rows |
| `doadmin` | Migrations / break-glass | Retained in `/root/.mosehxl-doadmin.env` on app host (root-only) |

Smoke: without tenant context, `legal_journal` count = 0 (RLS enforced); with
`app.establishment_id` set, counts match production. Backup role schema dump OK;
INSERT denied.

## Monthly 6-year vault

- Path: `/var/www/MOSEHXL/backups/long-retention/`
- Seeded: `mosehxl-prod-monthly-2026-07.dump` (+ sha256)
- Script: `scripts/backup-production-db.sh` copies on day `01` UTC (or `MOSEHXL_FORCE_MONTHLY=1`)
- Retention: 2190 days (~6 years)

## Provider-managed off-site backups

DigitalOcean managed PostgreSQL exposes continuous backup infrastructure
(`SHOW restore_command` → `pghoard_postgres_command_go …`). This is **off-host**
from the app droplet and is the primary off-site conservation control.

Raw capture on server:
`/var/www/MOSEHXL/backups/phase4-archive-evidence/do-managed-restore-command.txt`
(also copied under `raw/` when refreshed).

Optional hardening (not required to sign): Spaces bucket with Object Lock +
`MOSEHXL_S3_BUCKET` / `MOSEHXL_S3_ENDPOINT` (script already supports `aws s3 cp`).

## Admin 2FA

Still deferred: no user has `mfa_totp_enabled=true`. Enabling
`AUTH_ENFORCE_ADMIN_2FA=true` would lock operators out. Documented residual.
